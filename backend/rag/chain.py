"""
RAG Chain Module.
Refactored from notebook rag_bot() with enhanced streaming,
source attribution (document name, page number, snippet), and LangSmith tracing.
"""

import json
import logging
from typing import AsyncGenerator, Dict, List, Any
from langsmith import traceable
from langchain_core.documents import Document

from backend.rag.vectorstore import get_retriever
from backend.rag.llm import get_llm, get_streaming_llm

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are a precise, research-grade AI assistant answering strictly from the provided document context.

Context:
{context}

STRICT OPERATING RULES:
1. Answer the user's question using ONLY the factual information present in the Context above.
2. If the answer cannot be directly and accurately derived from the context, respond strictly with:
   "I don't know based on the available documents."
3. Do NOT extrapolate, speculate, or bring in outside knowledge not found in the Context.
4. When stating facts, you can reference the relevant document name or page if appropriate.
5. Provide clear, well-structured, formatted Markdown answers with code blocks when applicable.
"""


def format_context_and_sources(docs: List[Document]) -> tuple[str, List[Dict[str, Any]]]:
    """Format retrieved documents into context string and structured source metadata."""
    from urllib.parse import quote
    context_parts = []
    sources = []

    for i, doc in enumerate(docs):
        doc_name = doc.metadata.get("document_name") or doc.metadata.get("source_file") or doc.metadata.get("source") or "Document"
        page_num = doc.metadata.get("page_number") or (doc.metadata.get("page", 0) + 1 if "page" in doc.metadata else 1)
        source_file = doc.metadata.get("source_file") or doc_name
        source_url = doc.metadata.get("source_url", "")
        image_url = f"/api/documents/page-image?source_file={quote(str(source_file))}&page={page_num}"
        content = doc.page_content.strip()

        context_parts.append(f"--- [Source {i+1}: {doc_name} (Page {page_num})] ---\n{content}")

        sources.append({
            "source_id": i + 1,
            "document_name": doc_name,
            "source_file": source_file,
            "page": page_num,
            "image_url": image_url,
            "snippet": content[:300] + ("..." if len(content) > 300 else ""),
            "full_content": content,
            "source_url": source_url,
            "metadata": doc.metadata,
        })

    context_string = "\n\n".join(context_parts)
    return context_string, sources


@traceable(name="rag_query")
def rag_query(question: str, chat_history: List[Dict[str, str]] = None) -> Dict[str, Any]:
    """
    Standard non-streaming RAG query.
    Returns:
      {
        "answer": str,
        "sources": list[dict],
        "documents": list[Document]
      }
    """
    retriever = get_retriever()
    docs = retriever.invoke(question)

    if not docs:
        return {
            "answer": "I don't know based on the available documents.",
            "sources": [],
            "documents": [],
        }

    context_string, sources = format_context_and_sources(docs)
    system_message = SYSTEM_PROMPT.format(context=context_string)

    messages = [{"role": "system", "content": system_message}]

    # Append optional recent conversation history
    if chat_history:
        for turn in chat_history[-6:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if role in ["user", "assistant"] and content:
                messages.append({"role": role, "content": content})

    messages.append({"role": "user", "content": question})

    llm = get_llm()
    ai_response = llm.invoke(messages)

    return {
        "answer": ai_response.content,
        "sources": sources,
        "documents": docs,
    }


@traceable(name="rag_query_stream")
async def rag_query_stream(
    question: str,
    chat_history: List[Dict[str, str]] = None,
) -> AsyncGenerator[str, None]:
    """
    Async streaming RAG query yielding Server-Sent Events (SSE).
    Format of events:
      - event: sources (JSON payload with retrieved sources)
      - event: token (streamed text tokens)
      - event: done (signals stream end)
    """
    try:
        retriever = get_retriever()
        docs = retriever.invoke(question)

        if not docs:
            # Emit empty sources and no context answer
            yield f"event: sources\ndata: {json.dumps([])}\n\n"
            yield f"event: token\ndata: {json.dumps({'token': 'I don\'t know based on the available documents.'})}\n\n"
            yield "event: done\ndata: {}\n\n"
            return

        context_string, sources = format_context_and_sources(docs)

        # First send retrieved source cards so UI can display them immediately
        yield f"event: sources\ndata: {json.dumps(sources)}\n\n"

        system_message = SYSTEM_PROMPT.format(context=context_string)
        messages = [{"role": "system", "content": system_message}]

        if chat_history:
            for turn in chat_history[-6:]:
                role = turn.get("role", "user")
                content = turn.get("content", "")
                if role in ["user", "assistant"] and content:
                    messages.append({"role": role, "content": content})

        messages.append({"role": "user", "content": question})

        streaming_llm = get_streaming_llm()

        async for chunk in streaming_llm.astream(messages):
            token_content = chunk.content
            if token_content:
                yield f"event: token\ndata: {json.dumps({'token': token_content})}\n\n"

    except Exception as e:
        logger.error("Error during streaming generation: %s", e, exc_info=True)
        yield f"event: error\ndata: {json.dumps({'error': str(e)})}\n\n"

    yield "event: done\ndata: {}\n\n"
