import type { PeerReview } from '../types';
export declare class PeerReviewModel {
    static create(data: Omit<PeerReview, 'id' | 'createdAt'>): Promise<PeerReview>;
    static findById(id: string): Promise<PeerReview | null>;
    static findByReviewee(revieweeId: string, month: string): Promise<PeerReview[]>;
    static findByReviewer(reviewerId: string, month: string): Promise<PeerReview[]>;
    static findByDepartment(department: string, month: string): Promise<PeerReview[]>;
    static update(id: string, data: Partial<PeerReview>): Promise<PeerReview>;
    static delete(id: string): Promise<boolean>;
    static allocatePeerReviews(department: string, month: string): Promise<PeerReview[]>;
    private static findExistingAllocation;
}
//# sourceMappingURL=peerReview.model.d.ts.map