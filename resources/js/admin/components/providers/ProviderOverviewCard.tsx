type ProviderOverviewCardProps = {
  bio: string;
  subServices: string[];
};

export function ProviderOverviewCard({ bio, subServices }: ProviderOverviewCardProps) {
  const hasBio = Boolean(bio?.trim());
  const hasServices = subServices.length > 0;

  if (!hasBio && !hasServices) return null;

  return (
    <section className="panel-card provider-about" aria-label="نظرة عامة على المزود">
      {hasBio ? (
        <div className="provider-about__block">
          <h2 className="provider-about__label">نبذة</h2>
          <p className="provider-about__text">{bio}</p>
        </div>
      ) : null}

      {hasServices ? (
        <div className="provider-about__block">
          <h2 className="provider-about__label">الخدمات الفرعية</h2>
          <ul className="provider-about__tags">
            {subServices.map((service) => (
              <li key={service}>{service}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
