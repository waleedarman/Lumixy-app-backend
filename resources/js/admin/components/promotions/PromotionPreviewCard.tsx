import { AdminImage } from '../ui/AdminImage';
import type { AppPromotion } from '../../types';

type PromotionPreviewCardProps = {
  promotion: Pick<
    AppPromotion,
    'image' | 'title' | 'description' | 'buttonText'
  >;
  compact?: boolean;
};

export function PromotionPreviewCard({ promotion, compact = false }: PromotionPreviewCardProps) {
  const image = promotion.image;

  if (!image) {
    return (
      <div className="promotion-preview">
        <div className="promotion-preview__card" style={{ minHeight: compact ? 140 : 180 }}>
          <div className="promotion-preview__overlay">
            <p className="promotion-preview__desc">أضف صورة لمعاينة الإعلان.</p>
          </div>
        </div>
      </div>
    );
  }

  const hasText = Boolean(promotion.title || promotion.description || promotion.buttonText);

  return (
    <div className="promotion-preview">
      <div className="promotion-preview__card" style={{ minHeight: compact ? 140 : 180 }}>
        <AdminImage src={image} alt={promotion.title || 'معاينة الإعلان'} className="promotion-preview__image" />
        {hasText ? (
          <div className="promotion-preview__overlay">
            {promotion.title ? <h4 className="promotion-preview__title">{promotion.title}</h4> : null}
            {promotion.description ? <p className="promotion-preview__desc">{promotion.description}</p> : null}
            {promotion.buttonText ? <span className="promotion-preview__cta">{promotion.buttonText}</span> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
