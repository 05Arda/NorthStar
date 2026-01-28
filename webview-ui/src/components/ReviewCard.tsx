import React from "react";

interface ReviewCardProps {
  comment: string;
  onAccept: () => void;
  onReject: () => void;
}

export const ReviewCard: React.FC<ReviewCardProps> = ({
  comment,
  onAccept,
  onReject,
}) => {
  return (
    <div className="review-card">
      <div className="review-header">
        <div className="review-title-group">
          <span className="icon">📝</span>
          <span className="review-title">Proposed Comment</span>
        </div>
      </div>
      <div className="review-content">
        <div className="code-preview">
          {comment.split("\n").map((line, i) => (
            <div key={i} className="code-line">
              {line}
            </div>
          ))}
        </div>
      </div>
      <div className="review-actions">
        <button type="button" className="btn-reject" onClick={onReject}>
          Discard
        </button>
        <button type="button" className="btn-accept" onClick={onAccept}>
          Insert
        </button>
      </div>
    </div>
  );
};
