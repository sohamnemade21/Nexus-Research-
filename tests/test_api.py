"""
Production Unit & Regression Test Suite.
Uses Python's standard unittest, unittest.mock, and Starlette TestClient.
"""

import unittest
from unittest.mock import MagicMock, patch
from starlette.testclient import TestClient

import backend.main
import backend.rag.config

# Disable background seeding and Chroma lock during testing
backend.main.SEED_DOCUMENTS = False
backend.rag.config.SEED_DOCUMENTS = False
backend.main.ENV = "testing"
backend.rag.config.ENV = "testing"

from backend.main import app
from backend.api.models import ChatRequest, ChatMessage


class TestProductionAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Mock vector store so unit tests run instantaneously without Chroma disk lock
        cls.mock_vs_patch = patch("backend.rag.vectorstore.get_vectorstore")
        cls.mock_count_patch = patch("backend.rag.vectorstore.get_document_count", return_value=42)
        cls.mock_vs = cls.mock_vs_patch.start()
        cls.mock_count = cls.mock_count_patch.start()

        mock_instance = MagicMock()
        mock_instance._collection.count.return_value = 42
        mock_instance._collection.get.return_value = {"metadatas": [{"document_name": "TestDoc", "source_file": "test.pdf"}]}
        cls.mock_vs.return_value = mock_instance

        cls.client = TestClient(app, raise_server_exceptions=False)

    @classmethod
    def tearDownClass(cls):
        cls.mock_vs_patch.stop()
        cls.mock_count_patch.stop()

    def test_health_endpoint(self):
        """Verify /api/health returns 200 with model and vectorstore metadata."""
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn("status", data)
        self.assertEqual(data["status"], "healthy")
        self.assertTrue(data["vectorstore_ready"])
        self.assertIn("model", data)
        self.assertIn("embedding_model", data)

    def test_middleware_headers(self):
        """Verify X-Request-ID and X-Process-Time-Ms headers are present."""
        response = self.client.get("/api/documents")
        self.assertIn("x-request-id", response.headers)
        self.assertIn("x-process-time-ms", response.headers)

    def test_page_image_bounds_validation(self):
        """Verify out-of-bounds page or DPI triggers HTTP 400."""
        # Negative page
        res = self.client.get("/api/documents/page-image?source_file=test.pdf&page=0")
        self.assertEqual(res.status_code, 400)
        self.assertIn("Page number", res.json()["detail"])

        # Excessive DPI
        res = self.client.get("/api/documents/page-image?source_file=test.pdf&page=1&dpi=500")
        self.assertEqual(res.status_code, 400)
        self.assertIn("DPI", res.json()["detail"])

    def test_upload_non_pdf_rejection(self):
        """Verify non-PDF uploads are rejected immediately."""
        files = {"file": ("test.txt", b"plain text", "text/plain")}
        res = self.client.post("/api/documents/upload", files=files)
        self.assertEqual(res.status_code, 400)
        self.assertIn("Only PDF files", res.json()["detail"])

    def test_chat_request_schema_validation(self):
        """Verify Pydantic validates empty question or invalid fields."""
        # Empty question
        res = self.client.post("/api/chat", json={"question": ""})
        self.assertEqual(res.status_code, 422)

        # Valid payload model instantiate test
        req = ChatRequest(
            question="What is RAG?",
            stream=False,
            chat_history=[ChatMessage(role="user", content="Hi")],
        )
        self.assertEqual(req.question, "What is RAG?")
        self.assertEqual(len(req.chat_history), 1)


if __name__ == "__main__":
    unittest.main()
