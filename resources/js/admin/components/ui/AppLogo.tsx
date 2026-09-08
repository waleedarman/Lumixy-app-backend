import logoUrl from '../../assets/lumixy-logo.png';

type AppLogoProps = {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
};

const SIZE_CLASS = {
  sm: 'app-logo--sm',
  md: 'app-logo--md',
  lg: 'app-logo--lg',
  xl: 'app-logo--xl',
} as const;

export function AppLogo({ size = 'md', className = '' }: AppLogoProps) {
  return (
    <img
      src={logoUrl}
      alt="Lumixy"
      className={`app-logo ${SIZE_CLASS[size]} ${className}`.trim()}
      decoding="async"
    />
  );
}
