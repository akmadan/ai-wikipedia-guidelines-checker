import type { Feedback, ReviewResponse } from '../App';
import './FeedbackPanel.css';

interface FeedbackPanelProps {
    reviewData: ReviewResponse | null;
    selectedFeedback: Feedback | null;
    onSelectFeedback: (feedback: Feedback | null) => void;
    onAcceptFeedback: (feedback: Feedback) => void;
    onRejectFeedback: (feedback: Feedback) => void;
}

const FeedbackPanel = ({
    reviewData,
    selectedFeedback,
    onSelectFeedback,
    onAcceptFeedback,
    onRejectFeedback,
}: FeedbackPanelProps) => {
    if (!reviewData) {
        return (
            <div className="feedback-panel">
                <div className="panel-header">
                    <h2>Review Feedback</h2>
                    <p className="subtitle">Submit your content to see AI-powered suggestions</p>
                </div>

                <div className="empty-state">
                    <div className="empty-icon">
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </div>
                    <h3>No Review Yet</h3>
                    <p>
                        Write your Wikipedia article and click "Submit for Review" to get
                        AI-powered feedback on compliance with Wikipedia's guidelines.
                    </p>

                    <div className="guidelines-preview">
                        <h4>What we check:</h4>
                        <ul>
                            <li>
                                <span className="check-icon">✓</span>
                                <strong>Neutral Point of View (NPOV)</strong> - Unbiased, balanced content
                            </li>
                            <li>
                                <span className="check-icon">✓</span>
                                <strong>Verifiability</strong> - Claims backed by reliable sources
                            </li>
                            <li>
                                <span className="check-icon">✓</span>
                                <strong>No Original Research</strong> - Only published information
                            </li>
                            <li>
                                <span className="check-icon">✓</span>
                                <strong>Style & Tone</strong> - Encyclopedic writing standards
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    const { feedbacks, overall_score, summary, is_ready } = reviewData;
    const pendingFeedbacks = feedbacks.filter(fb => fb.status === 'pending');

    const getScoreColor = (score: number) => {
        if (score >= 80) return 'score-excellent';
        if (score >= 60) return 'score-good';
        if (score >= 40) return 'score-fair';
        return 'score-poor';
    };

    const getIssueTypeLabel = (type: string) => {
        const labels: Record<string, string> = {
            npov: 'Neutral POV',
            verifiability: 'Verifiability',
            original_research: 'Original Research',
            style: 'Style & Tone',
        };
        return labels[type] || type;
    };

    return (
        <div className="feedback-panel">
            <div className="panel-header">
                <h2>Wikipedia Review</h2>
                <div className="pr-meta">
                    <span className={`pr-status ${is_ready ? 'status-open' : 'status-draft'}`}>
                        {is_ready ? 'Ready' : 'Draft'}
                    </span>
                    <span className="pr-summary">{summary}</span>
                </div>
            </div>

            {/* Score Card / PR Checks */}
            <div className="pr-checks-card">
                <div className="checks-header">
                    <h3>Checks</h3>
                    <span className={`check-status ${overall_score >= 80 ? 'check-pass' : 'check-fail'}`}>
                        {overall_score >= 80 ? 'All checks passed' : `${pendingFeedbacks.length} issues found`}
                    </span>
                </div>
                <div className="score-bar-container">
                    <div className="score-label">Quality Score: {overall_score}/100</div>
                    <div className="progress-bar">
                        <div
                            className={`progress-fill ${getScoreColor(overall_score)}`}
                            style={{ width: `${overall_score}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            {/* Feedback List - Conversation Style */}
            <div className="feedback-list">
                <div className="list-header">
                    <h3>Conversation ({pendingFeedbacks.length})</h3>
                </div>

                {pendingFeedbacks.length === 0 ? (
                    <div className="no-issues">
                        <div className="success-icon">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M20 6L9 17L4 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <p>All checks passed! No issues found.</p>
                    </div>
                ) : (
                    <div className="feedback-items">
                        {pendingFeedbacks.map((feedback, index) => (
                            <div
                                key={index}
                                className={`review-comment ${selectedFeedback === feedback ? 'selected' : ''} severity-${feedback.severity}`}
                                onClick={() => onSelectFeedback(feedback)}
                            >
                                <div className="comment-header">
                                    <div className="author-info">
                                        <div className="bot-avatar">
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                                <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                            </svg>
                                        </div>
                                        <strong>WikiBot</strong>
                                        <span className="timestamp">commented on {getIssueTypeLabel(feedback.issue_type)}</span>
                                    </div>
                                    <span className={`label-badge label-${feedback.severity}`}>
                                        {feedback.severity}
                                    </span>
                                </div>

                                <div className="comment-body">
                                    <p>{feedback.feedback}</p>

                                    <div className="diff-view">
                                        <div className="diff-original">
                                            <span className="diff-marker">-</span>
                                            {feedback.original_sentence}
                                        </div>
                                        <div className="diff-suggested">
                                            <span className="diff-marker">+</span>
                                            {feedback.suggested_text}
                                        </div>
                                    </div>
                                </div>

                                <div className="comment-actions">
                                    <button
                                        className="btn-merge"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAcceptFeedback(feedback);
                                        }}
                                    >
                                        Merge Suggestion
                                    </button>
                                    <button
                                        className="btn-dismiss"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onRejectFeedback(feedback);
                                        }}
                                    >
                                        Dismiss
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default FeedbackPanel;
