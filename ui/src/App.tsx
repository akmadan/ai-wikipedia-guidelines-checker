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
                  <h2>Write Your Article</h2>
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
                      <svg className="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.3333 11.3333L14 14M12.6667 7.33333C12.6667 10.2789 10.2789 12.6667 7.33333 12.6667C4.38781 12.6667 2 10.2789 2 7.33333C2 4.38781 4.38781 2 7.33333 2C10.2789 2 12.6667 4.38781 12.6667 7.33333Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Submit for Review
                    </>
                  )}
                </button>

                <button
                  className="btn btn-secondary"
                  onClick={handleReset}
                  disabled={isReviewing}
                >
                  <svg className="icon" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.33333 4.00001V7.33334H4.66667M14.6667 12V8.66667H11.3333M4.66667 1.33334L1.33333 4.00001L4.66667 6.66668M11.3333 14.6667L14.6667 12L11.3333 9.33334M2.66667 9.33334C3.06949 10.4371 3.77121 11.4009 4.68512 12.1034C5.59903 12.8059 6.68726 13.2185 7.81333 13.2933C8.93941 13.3682 10.0572 13.1024 11.0309 12.5281C12.0046 11.9538 12.7923 11.0938 13.3013 10.0527C13.8103 9.01155 14.0203 7.83247 13.9055 6.66734C13.7907 5.50221 13.3562 4.40027 12.6556 3.48868C11.955 2.57709 11.0167 1.89273 9.94667 1.52001M2.66667 6.66668C2.26384 5.56292 1.56212 4.59912 0.648214 3.89661C-0.265691 3.1941 -1.35392 2.78152 -2.48 2.70668C-3.60607 2.63184 -4.72385 2.89764 -5.69756 3.47194C-6.67127 4.04624 -7.45903 4.90624 -7.96803 5.94734C-8.47703 6.98845 -8.68703 8.16753 -8.57221 9.33266C-8.45739 10.4978 -8.02288 11.5997 -7.32228 12.5113C-6.62168 13.4229 -5.68335 14.1073 -4.61333 14.48" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
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
