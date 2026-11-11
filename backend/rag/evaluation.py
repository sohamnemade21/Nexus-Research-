"""
Evaluation Module for LangSmith.
Preserves the complete LLM-as-a-judge evaluation suite from the original notebook:
- Correctness
- Relevance
- Groundedness
- Retrieval Relevance
Allows standalone execution or import into scripts.
"""

import os
import logging
from typing import Dict, Any, List
from typing_extensions import Annotated, TypedDict
from langchain_openai import ChatOpenAI
from langsmith import Client

from backend.rag.config import (
    OPENAI_API_KEY,
    OPENAI_MODEL,
    LANGCHAIN_PROJECT,
)
from backend.rag.chain import rag_query

logger = logging.getLogger(__name__)


# ============================================================
# Schemas for Structured Output Evaluators
# ============================================================

class CorrectnessGrade(TypedDict):
    explanation: Annotated[str, "Brief reason for the decision."]
    correct: Annotated[bool, "True if correct, otherwise False."]


class RelevanceGrade(TypedDict):
    explanation: Annotated[str, "Brief reason for the decision."]
    relevant: Annotated[bool, "True if relevant, otherwise False."]


class GroundedGrade(TypedDict):
    explanation: Annotated[str, "Brief reason for the decision."]
    grounded: Annotated[bool, "True if supported by the context, otherwise False."]


class RetrievalRelevanceGrade(TypedDict):
    explanation: Annotated[str, "Brief reason for the decision."]
    relevant: Annotated[bool, "True if relevant, otherwise False."]


# ============================================================
# LLM Judge Setup
# ============================================================

def _get_judge_llm(schema):
    return ChatOpenAI(
        model=OPENAI_MODEL,
        api_key=OPENAI_API_KEY,
        temperature=0,
        max_completion_tokens=64,
    ).with_structured_output(schema)


# Instructions preserved from notebook
correctness_instructions = """
Evaluate whether the GENERATED ANSWER is factually equivalent to the GROUND TRUTH ANSWER.

Rules:
1. True if both answers mean the same thing.
2. Extra information is allowed if correct.
3. False if incorrect, misleading, incomplete, or contradictory.
4. False if the answer says 'I don't know' when the ground truth contains the answer.

Return:
1. A short explanation.
2. The final boolean value.
"""

relevance_instructions = """
Determine whether the GENERATED ANSWER addresses the USER QUESTION.

Rules:
1. True if the answer addresses the question.
2. Extra information is allowed if relevant.
3. False if off-topic, misleading, incomplete, or unrelated.
4. False if the answer says 'I don't know' and the question can be answered.

Return:
1. A short explanation.
2. The final boolean value.
"""

grounded_instructions = """
Determine whether the GENERATED ANSWER is fully supported by the RETRIEVED CONTEXT.

Rules:
1. Every fact in the answer must be supported by the context.
2. Rewording and summarization are allowed.
3. If the answer contains unsupported information, return False.

Return:
1. A short explanation.
2. The final boolean value.
"""

retrieval_relevance_instructions = """
Determine whether the RETRIEVED DOCUMENTS contain information relevant to the USER QUESTION.

Rules:
1. True if the documents contain keywords, concepts, or semantic information related to the question.
2. Documents do not need to answer the entire question perfectly.
3. Some unrelated information is acceptable.
4. False only if the documents are completely unrelated.

Return:
1. A short explanation.
2. The final boolean value.
"""


# ============================================================
# Evaluator Functions (LangSmith format)
# ============================================================

def evaluate_correctness(run, example) -> Dict[str, Any]:
    prediction = run.outputs.get("answer", "") if run.outputs else ""
    reference = example.outputs.get("answer", "") if example.outputs else ""
    question = example.inputs.get("question", "") if example.inputs else ""

    grader = _get_judge_llm(CorrectnessGrade)
    prompt = f"Q:{question}\nGT:{reference}\nA:{prediction}"
    
    try:
        grade = grader.invoke([
            {"role": "system", "content": correctness_instructions},
            {"role": "user", "content": prompt}
        ])
        return {"key": "correctness", "score": 1.0 if grade["correct"] else 0.0, "comment": grade["explanation"]}
    except Exception as e:
        logger.error("Error in correctness evaluator: %s", e)
        return {"key": "correctness", "score": 0.0, "comment": str(e)}


def evaluate_relevance(run, example) -> Dict[str, Any]:
    prediction = run.outputs.get("answer", "") if run.outputs else ""
    question = example.inputs.get("question", "") if example.inputs else ""

    grader = _get_judge_llm(RelevanceGrade)
    prompt = f"Q:{question}\nA:{prediction}"
    
    try:
        grade = grader.invoke([
            {"role": "system", "content": relevance_instructions},
            {"role": "user", "content": prompt}
        ])
        return {"key": "relevance", "score": 1.0 if grade["relevant"] else 0.0, "comment": grade["explanation"]}
    except Exception as e:
        logger.error("Error in relevance evaluator: %s", e)
        return {"key": "relevance", "score": 0.0, "comment": str(e)}


def evaluate_groundedness(run, example) -> Dict[str, Any]:
    documents = run.outputs.get("documents", []) if run.outputs else []
    prediction = run.outputs.get("answer", "") if run.outputs else ""

    if not documents:
        return {"key": "groundedness", "score": 0.0, "comment": "No documents retrieved"}

    doc_string = "\n\n".join(
        getattr(doc, "page_content", str(doc))[:1000] for doc in documents
    )
    prompt = f"C:{doc_string}\nA:{prediction}"

    grader = _get_judge_llm(GroundedGrade)
    try:
        grade = grader.invoke([
            {"role": "system", "content": grounded_instructions},
            {"role": "user", "content": prompt}
        ])
        return {"key": "groundedness", "score": 1.0 if grade["grounded"] else 0.0, "comment": grade["explanation"]}
    except Exception as e:
        logger.error("Error in groundedness evaluator: %s", e)
        return {"key": "groundedness", "score": 0.0, "comment": str(e)}


def evaluate_retrieval_relevance(run, example) -> Dict[str, Any]:
    documents = run.outputs.get("documents", []) if run.outputs else []
    question = example.inputs.get("question", "") if example.inputs else ""

    if not documents:
        return {"key": "retrieval_relevance", "score": 0.0, "comment": "No documents retrieved"}

    doc_string = "\n\n".join(
        getattr(doc, "page_content", str(doc))[:1000] for doc in documents
    )
    prompt = f"Q:{question}\nD:{doc_string}"

    grader = _get_judge_llm(RetrievalRelevanceGrade)
    try:
        grade = grader.invoke([
            {"role": "system", "content": retrieval_relevance_instructions},
            {"role": "user", "content": prompt}
        ])
        return {"key": "retrieval_relevance", "score": 1.0 if grade["relevant"] else 0.0, "comment": grade["explanation"]}
    except Exception as e:
        logger.error("Error in retrieval_relevance evaluator: %s", e)
        return {"key": "retrieval_relevance", "score": 0.0, "comment": str(e)}


# ============================================================
# LangSmith Evaluation Pipeline Runner
# ============================================================

def run_rag_evaluation(dataset_name: str = "RAG Test Evaluation") -> Any:
    """Run full evaluation suite against a LangSmith dataset."""
    client = Client()

    def target_fn(inputs: dict) -> dict:
        question = inputs.get("question", "")
        return rag_query(question)

    results = client.evaluate(
        target_fn,
        data=dataset_name,
        evaluators=[
            evaluate_correctness,
            evaluate_relevance,
            evaluate_groundedness,
            evaluate_retrieval_relevance,
        ],
        experiment_prefix="production-rag-evaluation",
        metadata={
            "llm": OPENAI_MODEL,
            "application": "Perplexity-Style RAG Production",
            "project": LANGCHAIN_PROJECT,
        }
    )
    return results


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Starting RAG evaluation against LangSmith...")
    results = run_rag_evaluation()
    print("Evaluation completed!")
