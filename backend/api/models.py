"""
Pydantic API Schemas for Requests and Responses.
"""

from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000, description="The user question to research")
    stream: bool = Field(default=True, description="Whether to stream response via SSE")
    conversation_id: Optional[str] = Field(default=None, description="Optional conversation session ID")
    chat_history: Optional[List[ChatMessage]] = Field(default=[], description="Recent conversation turns")


class SourceReference(BaseModel):
    source_id: int
    document_name: str
    page: int
    snippet: str
    full_content: Optional[str] = None
    source_url: Optional[str] = ""
    image_url: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None


class ChatResponse(BaseModel):
    answer: str
    sources: List[SourceReference] = []
    conversation_id: Optional[str] = None


class DocumentUploadURLRequest(BaseModel):
    url: str = Field(..., description="Public direct URL to a PDF file")


class DocumentIndexingResponse(BaseModel):
    status: str
    document_name: str
    pages: int
    chunks: int
    message: str


class HealthResponse(BaseModel):
    status: str
    vectorstore_ready: bool
    chunks_count: int
    model: str
    embedding_model: str
    langsmith_tracing: bool
