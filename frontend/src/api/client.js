const API_BASE = import.meta.env.VITE_API_BASE || '/api';

export async function fetchHealth(signal) {
  const res = await fetch(`${API_BASE}/health`, { signal });
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchDocumentStatus(signal) {
  const res = await fetch(`${API_BASE}/documents`, { signal });
  if (!res.ok) throw new Error('Failed to fetch document status');
  return res.json();
}

export async function indexDocumentFromUrl(url, signal) {
  const res = await fetch(`${API_BASE}/documents/url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || 'Failed to index URL');
  }
  return res.json();
}

export async function uploadDocumentFile(file, signal) {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/documents/upload`, {
    method: 'POST',
    body: formData,
    signal,
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: 'Upload failed' }));
    throw new Error(errorData.detail || 'Failed to upload PDF');
  }
  return res.json();
}

export async function streamChatQuery({ question, chatHistory = [], onSources, onToken, onError, onDone, signal }) {
  try {
    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        question,
        stream: true,
        chat_history: chatHistory,
      }),
      signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Server returned ${response.status}: ${errorText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      let currentEvent = null;

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        if (trimmed.startsWith('event:')) {
          currentEvent = trimmed.replace('event:', '').trim();
        } else if (trimmed.startsWith('data:')) {
          const rawData = trimmed.replace('data:', '').trim();
          try {
            const parsed = JSON.parse(rawData);
            if (currentEvent === 'sources' || (Array.isArray(parsed) && !currentEvent)) {
              onSources && onSources(parsed);
            } else if (currentEvent === 'token') {
              onToken && onToken(parsed.token || '');
            } else if (currentEvent === 'error') {
              onError && onError(new Error(parsed.error || 'Stream error'));
            } else if (currentEvent === 'done') {
              onDone && onDone();
            }
          } catch (e) {
            // Handle plain string tokens if any
            if (currentEvent === 'token') {
              onToken && onToken(rawData);
            }
          }
        }
      }
    }

    onDone && onDone();
  } catch (err) {
    // Don't report aborted requests as errors
    if (err.name === 'AbortError') return;
    onError && onError(err);
  }
}
