import ReviewsDAO, { REVIEW_RESULT } from "../dao/reviewsDAO.js";

const MAX_COMMENT_LENGTH = 500;
const OBJECT_ID = /^[0-9a-f]{24}$/i;

const REVIEW_ERRORS = {
  [REVIEW_RESULT.TASK_NOT_FOUND]: [404, "Task not found"],
  [REVIEW_RESULT.FORBIDDEN]: [403, "Forbidden"],
  [REVIEW_RESULT.NOT_FINISHED]: [400, "Only finished tasks with an accepted sitter can be reviewed"],
  [REVIEW_RESULT.DUPLICATE]: [409, "This task has already been reviewed"],
};

const isObjectId = (value) => typeof value === "string" && OBJECT_ID.test(value);

export default class ReviewsController {
  static async apiPostReview(req, res) {
    const { taskId, rating, comment = "" } = req.body ?? {};

    if (!isObjectId(taskId)) return res.status(400).json({ error: "A valid taskId is required" });
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "rating must be an integer from 1 to 5" });
    }
    if (typeof comment !== "string") return res.status(400).json({ error: "comment must be a string" });
    const trimmed = comment.trim();
    if (trimmed.length > MAX_COMMENT_LENGTH) {
      return res.status(400).json({ error: `comment must be at most ${MAX_COMMENT_LENGTH} characters` });
    }

    try {
      // ownerId always comes from the token, never from the body.
      const { result, review } = await ReviewsDAO.addReview({
        taskId,
        ownerId: req.user.id,
        rating,
        comment: trimmed,
      });
      if (result !== REVIEW_RESULT.OK) {
        const [status, error] = REVIEW_ERRORS[result];
        return res.status(status).json({ error });
      }
      return res.status(201).json(review);
    } catch (e) {
      console.error(`apiPostReview failed: ${e}`);
      return res.status(500).json({ error: "Could not save review" });
    }
  }

  // Returns the sitter's reviews with their average rating (null when none).
  static async apiGetReviewsBySitter(req, res) {
    if (!isObjectId(req.params.sitterId)) return res.status(400).json({ error: "Invalid sitter id" });
    try {
      const reviews = await ReviewsDAO.getReviewsBySitterId(req.params.sitterId);
      const total = reviews.reduce((sum, review) => sum + review.rating, 0);
      const averageRating = reviews.length ? Math.round((total / reviews.length) * 10) / 10 : null;
      return res.json({ reviews, averageRating, count: reviews.length });
    } catch (e) {
      console.error(`apiGetReviewsBySitter failed: ${e}`);
      return res.status(500).json({ error: "Could not load reviews" });
    }
  }

  static async apiGetReviewByTask(req, res) {
    if (!isObjectId(req.params.taskId)) return res.status(400).json({ error: "Invalid task id" });
    try {
      const review = await ReviewsDAO.getReviewByTaskId(req.params.taskId);
      if (!review) return res.status(404).json({ error: "Review not found" });
      return res.json(review);
    } catch (e) {
      console.error(`apiGetReviewByTask failed: ${e}`);
      return res.status(500).json({ error: "Could not load review" });
    }
  }
}
