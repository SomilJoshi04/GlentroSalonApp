import { useState, useEffect, Fragment } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { getContent } from '../../services/userApi';
import PageHeader from '../../../../components/common/PageHeader';

const parseContentSections = (text) => {
  if (!text) return [];

  const hasHTML = /<[a-z][\s\S]*>/i.test(text);

  // If HTML, return a single block to preserve formatting safely
  if (hasHTML) {
    return [{ isHTML: true, content: text }];
  }

  // Normalize line breaks and collapse excessive blank lines
  let normalizedText = text.replace(/\r\n/g, '\n');
  normalizedText = normalizedText.replace(/\n{3,}/g, '\n\n');

  // Regex to match "1. Section Title" or "01 - Section Title"
  // It looks for a number, a dot, space, the title, and then the body.
  const sectionRegex = /(?:^|\n)([0-9]{1,2})\.\s+([^\n]+)\n([\s\S]*?)(?=(?:\n[0-9]{1,2})\.\s|$)/g;

  let sections = [];
  let match;
  let lastIndex = 0;

  while ((match = sectionRegex.exec(normalizedText)) !== null) {
    if (match.index > lastIndex) {
      const preamble = normalizedText.substring(lastIndex, match.index).trim();
      if (preamble) {
        sections.push({ isPreamble: true, body: preamble });
      }
    }

    sections.push({
      number: match[1].padStart(2, '0'),
      title: match[2].trim(),
      body: match[3].trim()
    });

    lastIndex = sectionRegex.lastIndex;
  }

  // Add remaining text if regex loop ended early (shouldn't happen with the lookahead, but safe)
  if (lastIndex < normalizedText.length && sections.length > 0) {
    const remainder = normalizedText.substring(lastIndex).trim();
    if (remainder) {
      sections[sections.length - 1].body += '\n\n' + remainder;
    }
  }

  // If no sections matched, return as a single preamble block
  if (sections.length === 0) {
    return [{ isPreamble: true, body: normalizedText }];
  }

  return sections;
};

const renderTextBlock = (text) => {
  const paragraphs = text.split('\n\n');

  return paragraphs.map((paragraph, index) => {
    const lines = paragraph.split('\n');

    // Detect basic list if there are multiple lines that look like list items
    const isListLike = lines.length >= 2 && lines.every(line => {
      const l = line.trim();
      // It's a list if it starts with a bullet, or is relatively short without ending punctuation
      if (l.startsWith('- ') || l.startsWith('* ')) return true;
      if (l.length > 0 && l.length < 80 && !/[.!?:]$/.test(l)) return true;
      return false;
    });

    if (isListLike) {
      return (
        <ul key={index} className="list-disc pl-5 mb-5 space-y-2 text-on-surface-variant leading-relaxed">
          {lines.map((line, lIndex) => {
            const cleanLine = line.replace(/^[-*]\s+/, '').trim();
            return cleanLine ? <li key={lIndex}>{cleanLine}</li> : null;
          })}
        </ul>
      );
    }

    return (
      <p key={index} className="mb-5 last:mb-0 text-on-surface-variant leading-relaxed whitespace-pre-wrap">
        {paragraph}
      </p>
    );
  });
};

export default function ContentPage({ type, titleFallback }) {
  const [content, setContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const fromProfile = location.state?.fromProfile;

  useEffect(() => {
    fetchData();
  }, [type]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getContent(type);
      if (res.data?.success) {
        setContent(res.data.data);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setError("This content has not been published yet.");
      } else {
        setError("Unable to load content. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  const parsedSections = parseContentSections(content?.body);

  const getSubtitle = () => {
    switch (type) {
      case 'privacy_policy':
        return 'Your privacy matters. Learn how GlentroSalon collects, uses, and protects your information.';
      case 'terms_conditions':
        return 'Please read these terms carefully before using our platform and services.';
      case 'booking_help':
        return 'Everything you need to know about booking, managing, and canceling your appointments.';
      default:
        return 'Important information and policies for using GlentroSalon.';
    }
  };

  const getPageTitle = () => {
    switch (type) {
      case 'privacy_policy': return 'Privacy Policy';
      case 'terms_conditions': return 'Terms & Conditions';
      case 'booking_help': return 'Help & Support';
      default: return content?.title || titleFallback;
    }
  };

  const title = getPageTitle();

  return (
    <div className="w-full min-h-screen bg-surface-bright pb-16">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-surface-container-lowest border-b border-border mb-8 py-8 md:py-16">
        <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none"></div>
        <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 relative z-10">

          <div className="flex items-center gap-4 mb-4">
            {fromProfile && (
              <button
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 text-on-surface-variant hover:bg-surface-variant rounded-full transition-colors flex items-center justify-center"
                aria-label="Go back"
              >
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            )}
          </div>

          <h1 className="font-headline-lg md:font-headline-xl text-3xl md:text-4xl lg:text-[40px] font-bold text-on-surface tracking-tight mb-4">
            {title}
          </h1>
          <p className="text-on-surface-variant text-base md:text-lg max-w-2xl">
            {getSubtitle()}
          </p>
        </div>
      </div>

      {/* Content Container */}
      <div className="w-full max-w-2xl md:max-w-4xl lg:max-w-4xl mx-auto px-4 sm:px-6 flex flex-col space-y-6">

        {loading ? (
          <div className="space-y-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface rounded-2xl p-6 border border-border shadow-sm animate-pulse">
                <div className="h-6 bg-surface-variant rounded w-1/4 mb-6"></div>
                <div className="space-y-3">
                  <div className="h-4 bg-surface-variant rounded w-full"></div>
                  <div className="h-4 bg-surface-variant rounded w-5/6"></div>
                  <div className="h-4 bg-surface-variant rounded w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-surface rounded-2xl p-12 border border-border shadow-sm flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-error/10 text-error rounded-full flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-[32px]">article</span>
            </div>
            <h3 className="font-headline-sm text-lg font-bold text-on-surface mb-2">Content Unavailable</h3>
            <p className="text-on-surface-variant">{error}</p>
          </div>
        ) : (
          <div className="space-y-6 md:space-y-8">
            {parsedSections.map((section, index) => {
              const delay = `${index * 100}ms`;

              // Render HTML block
              if (section.isHTML) {
                return (
                  <div
                    key={index}
                    className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm animate-fade-in-up"
                    style={{ animationDelay: delay }}
                  >
                    <div
                      className="prose prose-sm md:prose-base max-w-none text-on-surface whitespace-pre-wrap"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  </div>
                );
              }

              // Render Preamble block (content before the first numbered section)
              if (section.isPreamble) {
                return (
                  <div
                    key={index}
                    className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm animate-fade-in-up hover:-translate-y-1 hover:shadow-md transition-all duration-300"
                    style={{ animationDelay: delay }}
                  >
                    {renderTextBlock(section.body)}
                  </div>
                );
              }

              // Render Numbered Section Card
              return (
                <div
                  key={index}
                  className="bg-surface rounded-2xl p-6 md:p-8 border border-border shadow-sm animate-fade-in-up hover:-translate-y-1 hover:shadow-md transition-all duration-300 group overflow-hidden relative"
                  style={{ animationDelay: delay }}
                >
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/20 via-primary/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                  <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6 mb-6">
                    <div className="flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 text-primary font-bold text-lg">
                      {section.number}
                    </div>
                    <div className="flex-1 pt-1">
                      <h2 className="font-headline-sm text-xl font-bold text-on-surface tracking-tight">
                        {section.title}
                      </h2>
                    </div>
                  </div>

                  <div className="pl-0 md:pl-18">
                    {renderTextBlock(section.body)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
