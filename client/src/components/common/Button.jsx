const Button = ({ children, variant = 'primary', size = 'md', className = '', disabled = false, loading = false, onClick, type = 'button', ...props }) => {
  const baseStyles = 'inline-flex items-center justify-center font-semibold transition-all duration-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-dark focus:ring-primary shadow-md hover:shadow-lg active:scale-[0.98]',
    secondary: 'bg-surface text-primary border-2 border-primary hover:bg-soft-primary focus:ring-primary',
    accent: 'bg-secondary text-white hover:bg-secondary-container focus:ring-secondary shadow-md',
    ghost: 'text-primary hover:bg-soft-primary focus:ring-primary',
    danger: 'bg-error text-white hover:bg-error/90 focus:ring-error',
    outline: 'border border-outline text-on-surface hover:bg-surface-variant focus:ring-outline',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm gap-1.5',
    md: 'px-5 py-2.5 text-sm gap-2',
    lg: 'px-7 py-3.5 text-base gap-2.5',
    xl: 'px-9 py-4 text-lg gap-3',
  };

  return (
    <button
      type={type}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 h-4 w-4" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )}
      {children}
    </button>
  );
};

export default Button;
