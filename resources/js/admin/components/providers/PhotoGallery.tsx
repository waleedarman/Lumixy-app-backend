import { EmptyState } from '../EmptyState';
import { AdminImage } from '../ui/AdminImage';

type GalleryItem = {
  id: string;
  url: string;
};

type PhotoGalleryProps = {
  items: GalleryItem[];
  providerName: string;
  onImageClick: (url: string) => void;
};

export function PhotoGallery({ items, providerName, onImageClick }: PhotoGalleryProps) {
  if (items.length === 0) {
    return (
      <EmptyState
        icon="image"
        title="لا توجد صور"
        description="لم يرفع المزود أي صور في الألبوم بعد."
      />
    );
  }

  return (
    <div className="provider-gallery" role="list" aria-label={`ألبوم صور ${providerName}`}>
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          role="listitem"
          className="provider-gallery__item"
          aria-label={`عرض صورة ${index + 1}`}
          onClick={() => onImageClick(item.url)}
        >
          <AdminImage
            src={item.url}
            alt={`${providerName} — صورة ${index + 1}`}
            className="provider-gallery__img"
          />
        </button>
      ))}
    </div>
  );
}
