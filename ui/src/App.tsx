import { useState } from 'react';
import Editor from './components/Editor';
import FeedbackPanel from './components/FeedbackPanel';
import Header from './components/Header';
import './App.css';

export interface Feedback {
  original_sentence: string;
  feedback: string;
  suggested_text: string;
  issue_type: 'npov' | 'verifiability' | 'original_research' | 'style';
  severity: 'high' | 'medium' | 'low';
  start_index: number;
  end_index: number;
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ReviewResponse {
  feedbacks: Feedback[];
  overall_score: number;
  summary: string;
  is_ready: boolean;
}

function App() {
  const [content, setContent] = useState(''); // Stores HTML now
  const [plainText, setPlainText] = useState('');
  const [title, setTitle] = useState('');
  const [reviewData, setReviewData] = useState<ReviewResponse | null>(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [feedbackToAccept, setFeedbackToAccept] = useState<Feedback | null>(null);

  // Layout state
  const [isEditorExpanded, setIsEditorExpanded] = useState(true);
  const [isFeedbackExpanded, setIsFeedbackExpanded] = useState(true);

  // Derive plain text for API
  const handleContentChange = (html: string, text: string) => {
    setContent(html);
    setPlainText(text);
  };

  const handleReview = async () => {
    if (!plainText.trim()) {
      alert('Please enter some content to review');
      return;
    }

    setIsReviewing(true);
    // Expand feedback panel if collapsed
    if (!isFeedbackExpanded) setIsFeedbackExpanded(true);

    try {
      const response = await fetch('http://localhost:8000/api/review', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: plainText,
          title: title || 'Untitled Article',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to review content');
      }

      const data: ReviewResponse = await response.json();

      // Add status to each feedback
      const feedbacksWithStatus = data.feedbacks.map(fb => ({
        ...fb,
        status: 'pending' as const,
      }));

      setReviewData({
        ...data,
        feedbacks: feedbacksWithStatus,
      });

      // Auto-collapse editor if screen is small? user choice.
    } catch (error) {
      console.error('Error reviewing content:', error);
      alert('Failed to review content. Make sure the backend is running.');
    } finally {
      setIsReviewing(false);
    }
  };

  const handleAcceptFeedback = (feedback: Feedback) => {
    // Trigger Editor to apply change
    setFeedbackToAccept(feedback);
  };

  const onFeedbackAccepted = (feedback: Feedback) => {
    // Called by Editor when text replacement is done
    if (!reviewData) return;

    const updatedFeedbacks = reviewData.feedbacks.map(fb =>
      fb === feedback ? { ...fb, status: 'accepted' as const } : fb
    );

    setReviewData({
      ...reviewData,
      feedbacks: updatedFeedbacks,
    });
    setFeedbackToAccept(null);
    setSelectedFeedback(null);
  };

  const handleRejectFeedback = (feedback: Feedback) => {
    if (!reviewData) return;

    const updatedFeedbacks = reviewData.feedbacks.map(fb =>
      fb === feedback ? { ...fb, status: 'rejected' as const } : fb
    );

    setReviewData({
      ...reviewData,
      feedbacks: updatedFeedbacks,
    });

    setSelectedFeedback(null);
  };

  const handleReset = () => {
    setContent('');
    setPlainText('');
    setTitle('');
    setReviewData(null);
    setSelectedFeedback(null);
  };

  return (
    <div className="app">
      <Header />

      <main className="main-container">
        <div className={`content-wrapper ${isEditorExpanded ? '' : 'editor-collapsed'} ${isFeedbackExpanded ? '' : 'feedback-collapsed'}`}>
          {/* Left Panel - Editor */}
          {isEditorExpanded && (
            <div className={`editor-panel ${isFeedbackExpanded ? '' : 'full-width'}`}>
              <div
                className="panel-collapse-btn editor-collapse-btn"
                onClick={() => setIsEditorExpanded(false)}
                title="Collapse Editor"
              >
                ◀
              </div>

              <div className="panel-header-row">
                <div className="panel-header">
                  <h2>✍️ Write Your Article</h2>
                  <p className="subtitle">
                    Create Wikipedia content with AI-powered guidance
                  </p>
                </div>
              </div>

              <div className="title-input-wrapper">
                <input
                  type="text"
                  className="title-input"
                  placeholder="Article Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <Editor
                content={content}
                onChange={handleContentChange}
                feedbacks={reviewData?.feedbacks || []}
                selectedFeedback={selectedFeedback}
                onSelectFeedback={setSelectedFeedback}
                feedbackToAccept={feedbackToAccept}
                onAcceptComplete={onFeedbackAccepted}
              />

              <div className="action-buttons">
                <button
                  className="btn btn-primary"
                  onClick={handleReview}
                  disabled={isReviewing || !plainText.trim()}
                >
                  {isReviewing ? (
                    <>
                      <span className="spinner"></span>
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <span className="icon">🔍</span>
                      Submit for Review
                    </>
                  )}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={isReviewing}
                >
                  <span className="icon">🔄</span>
                  Reset
                </button>
              </div>
            </div>
          )}

          {!isEditorExpanded && (
            <div className="collapsed-panel editor-collapsed-bar" onClick={() => setIsEditorExpanded(true)}>
              <div className="collapsed-handle">
                <span className="collapsed-arrow">▶</span>
                <span className="vertical-text">Editor</span>
              </div>
            </div>
          )}

          {/* Right Panel - Feedback */}
          {isFeedbackExpanded && (
            <div className={`feedback-panel-wrapper ${isEditorExpanded ? '' : 'full-width'}`}>
              <div
                className="panel-collapse-btn feedback-collapse-btn"
                onClick={() => setIsFeedbackExpanded(false)}
                title="Collapse Feedback"
              >
                ▶
              </div>

              <FeedbackPanel
                reviewData={reviewData}
                selectedFeedback={selectedFeedback}
                onSelectFeedback={setSelectedFeedback}
                onAcceptFeedback={handleAcceptFeedback}
                onRejectFeedback={handleRejectFeedback}
              />
            </div>
          )}

          {!isFeedbackExpanded && (
            <div className="collapsed-panel feedback-collapsed-bar" onClick={() => setIsFeedbackExpanded(true)}>
              <div className="collapsed-handle">
                <span className="collapsed-arrow">◀</span>
                <span className="vertical-text">Feedback</span>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
