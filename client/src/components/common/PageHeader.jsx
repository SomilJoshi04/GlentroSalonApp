import { useNavigate } from 'react-router-dom';

const PageHeader = ({ title }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center gap-3 py-3 md:hidden">
      <button 
        onClick={() => navigate(-1)} 
        className="w-11 h-11 flex items-center justify-center rounded-full hover:bg-surface-variant transition-colors -ml-3 text-on-surface"
        aria-label="Go back"
      >
        <span className="material-symbols-outlined text-[24px]">arrow_back</span>
      </button>
      <h1 className="font-headline-sm text-[20px] md:text-[24px] text-on-surface font-semibold">{title}</h1>
    </div>
  );
};

export default PageHeader;
