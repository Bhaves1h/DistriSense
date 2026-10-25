import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DASHBOARD_URL, API_BASE_URL } from '../config';

const QUIZ_QUESTIONS = [
  {
    id: 'shops',
    question: "How many shops do you supply?",
    options: ["Under 25", "25–50", "51–100", "100+"]
  },
  {
    id: 'warehouses',
    question: "How many warehouses do you run?",
    options: ["1", "2–3", "4–5", "More than 5"]
  },
  {
    id: 'skus',
    question: "How many products (SKUs) do you carry?",
    options: ["Under 50", "50–120", "120–300", "300+"]
  },
  {
    id: 'tool',
    question: "How do you track stock today?",
    options: ["Excel sheets", "Paper registers", "Tally or other software", "Nothing yet"]
  },
  {
    id: 'pain',
    question: "What hurts your business most?",
    options: ["Stockouts", "Expired stock", "Both equally"]
  }
];

export default function LoginPage() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
  const googleBtnRef = useRef(null);
  const emailInputRef = useRef(null);

  // View state: 'register' -> 'google-org' (if Google auth) -> 'quiz' -> 'complete'
  const [view, setView] = useState('register');
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizAnswers, setQuizAnswers] = useState({
    shops: '51–100',
    warehouses: '2–3',
    skus: '120–300',
    tool: 'Excel sheets',
    pain: 'Both equally'
  });
  const [selectedOption, setSelectedOption] = useState(null);

  // Standard Form state
  const [organisationName, setOrganisationName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [workEmail, setWorkEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [orgError, setOrgError] = useState('');

  // Google Flow state
  const [googleOrgName, setGoogleOrgName] = useState('');
  const [googleOrgError, setGoogleOrgError] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [googleAuthError, setGoogleAuthError] = useState('');
  const [googleProfile, setGoogleProfile] = useState(null);

  // Selected company for dashboard greeting
  const [company, setCompany] = useState('');

  // FIX C: Starting a fresh registration (arriving at #/login) clears ds_onboarding from any previous session
  useEffect(() => {
    try {
      localStorage.removeItem('ds_onboarding');
    } catch (_) {}
    setQuizIndex(0);
    setSelectedOption(null);
  }, []);

  // Initialize official Google Identity Services button
  useEffect(() => {
    if (!googleClientId || view !== 'register') return;

    const renderOfficialButton = () => {
      if (window.google?.accounts?.id && googleBtnRef.current) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleClientId,
            callback: handleGoogleCredentialResponse,
          });
          googleBtnRef.current.innerHTML = '';
          window.google.accounts.id.renderButton(googleBtnRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            shape: 'rectangular',
            text: 'continue_with',
            logo_alignment: 'left',
            width: 360,
          });
        } catch (err) {
          console.warn('Google renderButton error:', err);
        }
      }
    };

    if (window.google?.accounts?.id) {
      renderOfficialButton();
    } else {
      const interval = setInterval(() => {
        if (window.google?.accounts?.id) {
          clearInterval(interval);
          renderOfficialButton();
        }
      }, 150);
      return () => clearInterval(interval);
    }
  }, [googleClientId, view]);

  // FIX A: Google credential callback — POST must go to backend's absolute URL (http://localhost:8000/auth/google)
  const handleGoogleCredentialResponse = async (response) => {
    if (!response?.credential) return;
    setIsGoogleLoading(true);
    setGoogleAuthError('');

    try {
      // Credential POST uses VITE_API_BASE_URL when set (fall back to VITE_DASHBOARD_URL origin, then http://localhost:8000 in dev)
      const backendUrl = `${API_BASE_URL}/auth/google`;
      const res = await fetch(backendUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential }),
      });

      if (!res.ok) {
        let errorDetail = `HTTP ${res.status}`;
        try {
          const errJson = await res.json();
          if (errJson?.detail) errorDetail = errJson.detail;
        } catch (_) {}
        throw new Error(`Authentication verification failed: ${errorDetail}`);
      }

      const profile = await res.json();
      setGoogleProfile(profile);
      setIsGoogleLoading(false);

      // Google returns a person's name, not a company -> Insert ONE extra first screen
      setView('google-org');
    } catch (err) {
      console.error('Google sign-in error:', err);
      setIsGoogleLoading(false);
      setGoogleAuthError('Google sign-in could not be verified. Please try again or use the form.');
    }
  };

  // FIX C: Navigate to the dashboard WITH ?company={the organisation from THIS registration} — never a bare dashboard URL.
  const redirectToDashboard = (companyName) => {
    const raw = companyName || company || organisationName || googleOrgName || '';
    const trimmed = raw.trim() || 'Apex FMCG Distributors';
    try {
      localStorage.setItem('ds_company', trimmed);
    } catch (_) {}

    let baseUrl = DASHBOARD_URL;
    const hashIndex = baseUrl.indexOf('#');
    let hashPart = '';
    if (hashIndex !== -1) {
      hashPart = baseUrl.substring(hashIndex);
      baseUrl = baseUrl.substring(0, hashIndex);
    }
    const separator = baseUrl.includes('?') ? '&' : '?';
    const target = `${baseUrl}${separator}company=${encodeURIComponent(trimmed)}${hashPart}`;
    window.location.href = target;
  };

  // Form submit -> Sets company, clears onboarding, advances to clean Quiz
  const handleRegisterSubmit = (e) => {
    e.preventDefault();
    const org = organisationName.trim();
    if (!org) {
      setOrgError('Please enter your organisation name to begin.');
      return;
    }
    setOrgError('');
    setCompany(org);
    try {
      localStorage.setItem('ds_company', org);
      localStorage.removeItem('ds_onboarding');
    } catch (_) {}
    setView('quiz');
    setQuizIndex(0);
  };

  // Google extra screen submit -> Sets company, clears onboarding, advances to clean Quiz
  const handleGoogleOrgSubmit = (e) => {
    e.preventDefault();
    const org = googleOrgName.trim();
    if (!org) {
      setGoogleOrgError('Please enter your organisation name to continue.');
      return;
    }
    setGoogleOrgError('');
    setCompany(org);
    try {
      localStorage.setItem('ds_company', org);
      localStorage.removeItem('ds_onboarding');
    } catch (_) {}
    setView('quiz');
    setQuizIndex(0);
  };

  // Quiz option tap -> auto-advance after 250ms
  const handleOptionClick = (questionId, optionValue) => {
    setSelectedOption(optionValue);
    const updated = { ...quizAnswers, [questionId]: optionValue };
    setQuizAnswers(updated);
    try {
      localStorage.setItem('ds_onboarding', JSON.stringify(updated));
    } catch (_) {}

    setTimeout(() => {
      setSelectedOption(null);
      if (quizIndex < QUIZ_QUESTIONS.length - 1) {
        setQuizIndex(prev => prev + 1);
      } else {
        setView('complete');
      }
    }, 250);
  };

  // Quiz skip
  const handleQuizSkip = () => {
    setSelectedOption(null);
    try {
      localStorage.setItem('ds_onboarding', JSON.stringify(quizAnswers));
    } catch (_) {}
    setView('complete');
  };

  // Quiz back
  const handleQuizBack = () => {
    setSelectedOption(null);
    if (quizIndex > 0) {
      setQuizIndex(prev => prev - 1);
    } else if (view === 'quiz' && googleProfile) {
      setView('google-org');
    } else {
      setView('register');
    }
  };

  // Active step number: Step 1 (register), Step 2 (google-org or quiz), Step 3 (complete)
  const currentStepNumber = view === 'register' ? 1 : (view === 'quiz' || view === 'google-org') ? 2 : 3;

  // Final summary line
  const summaryLine = `${quizAnswers.shops || '51–100'} shops · ${quizAnswers.warehouses || '2–3'} warehouses · ${quizAnswers.skus || '120–300'} SKUs · tracked on ${quizAnswers.tool || 'Excel sheets'} today`;

  return (
    <main className="flex min-h-screen w-full bg-black text-white selection:bg-white/30 p-2 transition-all duration-500 lg:h-screen lg:overflow-hidden lg:p-4 font-sans">
      {/* =========================================================================
          PART 1: LEFT PANEL — Exact Spacing, Un-clipped, Top-Anchored Air
          ========================================================================= */}
      <div 
        className="hidden lg:block w-[50%] relative rounded-3xl overflow-hidden shadow-2xl h-full select-none"
        style={{
          background: 'linear-gradient(135deg, #173F3B 0%, #20605C 100%)'
        }}
      >
        {/* Full-bleed Aurora Video — NO overlay */}
        <video
          className="absolute inset-0 w-full h-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260506_081238_406ed0e3-5d83-436e-a512-0bbff7ec5b95.mp4"
        />

        {/* Panel content wrapper: absolute inset-0, padding 56px on sides and top, 48px bottom */}
        <div 
          className="absolute inset-0 flex flex-col items-start justify-start z-10 box-border pointer-events-none"
          style={{
            padding: '56px 56px 48px 56px'
          }}
        >
          {/* "● DistriSense" mark: uppercase, letter-spacing 0.24em, ~13px, margin-bottom 28px */}
          <div 
            className="flex items-center gap-2.5 uppercase font-medium text-white"
            style={{
              letterSpacing: '0.24em',
              fontSize: '13px',
              marginBottom: '28px'
            }}
          >
            <span className="text-[#8AAFA7] text-[10px]">●</span>
            <span>DistriSense</span>
          </div>

          {/* Headline "Join DistriSense": Instrument Serif, ~54px, line-height 1.08, letter-spacing 0.02em */}
          <h1 
            className="text-white font-normal"
            style={{
              fontFamily: '"Instrument Serif", Georgia, serif',
              fontSize: '54px',
              lineHeight: 1.08,
              letterSpacing: '0.02em'
            }}
          >
            Join DistriSense
          </h1>

          {/* Subtitle "Three quick steps to your live territory.": margin-top 16px, letter-spacing 0.04em, line-height 1.5 */}
          <p 
            className="text-white/70"
            style={{
              marginTop: '16px',
              letterSpacing: '0.04em',
              lineHeight: 1.5,
              fontSize: '15px'
            }}
          >
            Three quick steps to your live territory.
          </p>

          {/* Steps list: margin-top 44px, flex column, gap 20px. Each row: letter-spacing 0.05em, ~15px, line-height 1.4 */}
          <div 
            className="flex flex-col items-start"
            style={{
              marginTop: '44px',
              gap: '20px'
            }}
          >
            <StepItem
              text="1 · Register your organisation"
              active={currentStepNumber === 1}
            />
            <StepItem
              text="2 · Set up your territory"
              active={currentStepNumber === 2}
            />
            <StepItem
              text="3 · Open your dashboard"
              active={currentStepNumber === 3}
            />
          </div>
        </div>
      </div>

      {/* =========================================================================
          RIGHT COLUMN: Form, Google-Org, Quiz, or Complete View
          ========================================================================= */}
      <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 sm:px-12 lg:px-16 xl:px-20 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* VIEW 1: REGISTRATION FORM */}
            {view === 'register' && (
              <motion.div
                key="register-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="w-full"
              >
                {/* Header */}
                <div className="text-left">
                  <h2 className="text-3xl font-medium tracking-tight text-white">
                    Register Your Organisation
                  </h2>
                  <p className="text-white/45 text-sm" style={{ marginTop: '10px' }}>
                    Input your organisation details to begin the journey.
                  </p>
                </div>

                {/* Social Row: Official Google Button (gracefully hidden if client ID empty) */}
                {googleClientId ? (
                  <div style={{ marginTop: '28px' }}>
                    <div className="w-full flex justify-center min-h-[44px]">
                      <div ref={googleBtnRef} className="w-full flex justify-center" />
                    </div>

                    {isGoogleLoading && (
                      <div className="flex items-center justify-center gap-2 text-xs text-white/60" style={{ margin: '10px 0' }}>
                        <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        <span>Verifying Google account...</span>
                      </div>
                    )}

                    {googleAuthError && (
                      <p className="text-xs text-red-400 text-center" style={{ margin: '10px 0' }}>
                        {googleAuthError}
                      </p>
                    )}

                    {/* OR Divider */}
                    <div className="relative flex items-center justify-center" style={{ margin: '26px 0' }}>
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-white/10" />
                      </div>
                      <span className="relative bg-black px-4 text-xs font-medium text-white/40 uppercase tracking-widest">
                        OR
                      </span>
                    </div>
                  </div>
                ) : null}

                {/* Form Fields: Organisation-first, roomy h-12 inputs, gap 28px */}
                <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  {/* 1. Organisation Name */}
                  <InputGroup
                    label="Organisation Name"
                    placeholder="e.g. Shree Ganesh Distributors"
                    type="text"
                    value={organisationName}
                    onChange={(e) => {
                      setOrganisationName(e.target.value);
                      if (orgError) setOrgError('');
                    }}
                    required
                    error={orgError}
                  />

                  {/* 2. Contact Person */}
                  <InputGroup
                    label="Contact Person"
                    placeholder="e.g. Rohit Sharma"
                    type="text"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    required
                  />

                  {/* 3. Work Email */}
                  <InputGroup
                    ref={emailInputRef}
                    label="Work Email"
                    placeholder="you@company.in"
                    type="email"
                    value={workEmail}
                    onChange={(e) => setWorkEmail(e.target.value)}
                    required
                  />

                  {/* 4. Password with Eye toggle */}
                  <InputGroup
                    label="Password"
                    placeholder="Requires at least 8 symbols"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    helperText="Requires at least 8 symbols."
                    rightElement={
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="text-white/40 hover:text-white transition-colors cursor-pointer"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    }
                  />

                  {/* Full-width white submit button */}
                  <button
                    type="submit"
                    className="w-full h-12 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                    style={{ marginTop: '32px' }}
                  >
                    Create Account
                  </button>
                </form>

                {/* Footer link */}
                <p className="text-center text-sm text-white/40" style={{ marginTop: '24px' }}>
                  Member of the team?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      if (window.google?.accounts?.id && googleClientId) {
                        window.google.accounts.id.prompt();
                      } else {
                        emailInputRef.current?.focus();
                      }
                    }}
                    className="text-white hover:underline cursor-pointer font-medium"
                  >
                    Log in
                  </button>
                </p>
              </motion.div>
            )}

            {/* VIEW 1.5: GOOGLE EXTRA FIRST QUIZ SCREEN (What's your organisation's name?) */}
            {view === 'google-org' && (
              <motion.div
                key="google-org-screen"
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25 }}
                className="w-full text-left"
              >
                {/* Header Row: Back link */}
                <div className="flex items-center justify-between text-xs text-white/50" style={{ marginBottom: '28px' }}>
                  <button
                    type="button"
                    onClick={() => setView('register')}
                    className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                  >
                    <ArrowLeft size={14} />
                    <span>Back</span>
                  </button>

                  <span className="font-medium text-white/40 uppercase tracking-wider">
                    Google Sign-In · Setup
                  </span>

                  <div className="w-10" />
                </div>

                {/* Greeting Google user */}
                <div style={{ marginBottom: '36px' }}>
                  <div className="flex items-center gap-3 pb-3">
                    {googleProfile?.picture ? (
                      <img
                        src={googleProfile.picture}
                        alt="Profile"
                        className="w-9 h-9 rounded-full border border-white/20"
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-full bg-[#20605C] text-white flex items-center justify-center font-semibold text-sm">
                        {googleProfile?.name?.charAt(0) || 'G'}
                      </div>
                    )}
                    <div>
                      <p className="text-sm font-medium text-white">{googleProfile?.name}</p>
                      <p className="text-xs text-white/45">{googleProfile?.email}</p>
                    </div>
                  </div>

                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white pt-2" style={{ marginBottom: '12px' }}>
                    What's your organisation's name?
                  </h2>
                  <p className="text-white/45 text-sm">
                    DistriSense will configure your territory and morning greeting under this business.
                  </p>
                </div>

                <form onSubmit={handleGoogleOrgSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
                  <InputGroup
                    label="Organisation Name"
                    placeholder="e.g. Shree Ganesh Distributors"
                    type="text"
                    value={googleOrgName}
                    onChange={(e) => {
                      setGoogleOrgName(e.target.value);
                      if (googleOrgError) setGoogleOrgError('');
                    }}
                    required
                    error={googleOrgError}
                  />

                  <button
                    type="submit"
                    className="w-full h-12 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                    style={{ marginTop: '32px' }}
                  >
                    Continue to Territory Setup
                  </button>
                </form>
              </motion.div>
            )}

            {/* VIEW 2: BUSINESS QUIZ (5 QUESTIONS) */}
            {view === 'quiz' && (
              <motion.div
                key={`quiz-step-${quizIndex}`}
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.22 }}
                className="w-full text-left"
              >
                {/* Header Row (Back · STEP X OF 5 · Skip for now) + Progress bar */}
                <div style={{ marginBottom: '28px' }}>
                  <div className="flex items-center justify-between text-xs text-white/50" style={{ marginBottom: '14px' }}>
                    <button
                      type="button"
                      onClick={handleQuizBack}
                      className="inline-flex items-center gap-1.5 hover:text-white transition-colors cursor-pointer"
                    >
                      <ArrowLeft size={14} />
                      <span>Back</span>
                    </button>

                    <span className="font-medium text-white/40 uppercase tracking-wider">
                      Step {quizIndex + 1} of 5
                    </span>

                    <button
                      type="button"
                      onClick={handleQuizSkip}
                      className="hover:text-white transition-colors cursor-pointer"
                    >
                      Skip for now
                    </button>
                  </div>

                  {/* Slim Progress Bar sits 14px under header row */}
                  <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-white transition-all duration-300"
                      style={{ width: `${((quizIndex + 1) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Question */}
                <div>
                  <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-white" style={{ marginBottom: '36px' }}>
                    {QUIZ_QUESTIONS[quizIndex].question}
                  </h2>
                </div>

                {/* Tappable Option Cards (gap 18px, padding 20px 22px, min-height 64px, letter-spacing 0.02em) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '18px' }}>
                  {QUIZ_QUESTIONS[quizIndex].options.map((option) => {
                    const isSelected = selectedOption === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleOptionClick(QUIZ_QUESTIONS[quizIndex].id, option)}
                        style={{
                          padding: '20px 22px',
                          minHeight: '64px',
                        }}
                        className={`w-full rounded-xl border text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-white text-black border-white shadow-lg'
                            : 'bg-white/5 text-white border-white/10 hover:bg-white/10 hover:border-white/20'
                        }`}
                      >
                        <span className="text-base font-medium" style={{ letterSpacing: '0.02em' }}>{option}</span>
                        <span
                          className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isSelected
                              ? 'border-black bg-black text-white'
                              : 'border-white/30 bg-transparent'
                          }`}
                        >
                          {isSelected && <Check size={12} strokeWidth={3} />}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* VIEW 3: QUIZ COMPLETE / READY TO LAUNCH DASHBOARD */}
            {view === 'complete' && (
              <motion.div
                key="quiz-complete"
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
                className="w-full space-y-6 text-left"
              >
                <div className="w-12 h-12 rounded-full bg-[#20605C] flex items-center justify-center text-white mb-2">
                  <Check size={24} strokeWidth={2.5} />
                </div>

                <div>
                  <h2 className="text-3xl font-medium tracking-tight text-white">
                    Your territory is ready.
                  </h2>
                  <p className="text-white/80 text-base mt-3 font-normal leading-relaxed">
                    {summaryLine}
                  </p>
                  <p className="text-white/45 text-sm mt-2">
                    Your demo dashboard is set to the Kolhapur territory.
                  </p>
                </div>

                <div className="pt-4">
                  <button
                    type="button"
                    onClick={() => redirectToDashboard(company)}
                    className="w-full h-12 bg-white text-black font-semibold rounded-xl hover:bg-white/90 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Open my dashboard
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

// Left Column Step Item — starts at same left edge, padding 8px 16px, radius 999px, letter-spacing 0.05em, line-height 1.4
function StepItem({ text, active }) {
  return (
    <div
      className={`inline-flex items-center transition-all duration-200 ${
        active
          ? 'bg-white text-black font-semibold shadow-md'
          : 'text-white/55 font-normal'
      }`}
      style={{
        padding: '8px 16px',
        borderRadius: '999px',
        fontSize: '15px',
        lineHeight: 1.4,
        letterSpacing: '0.05em'
      }}
    >
      <span>{text}</span>
    </div>
  );
}

// Custom Input Field with Label, helper text, and error handling
const InputGroup = React.forwardRef(function InputGroup(
  { label, placeholder, type = 'text', value, onChange, required, helperText, error, rightElement },
  ref
) {
  return (
    <div className="w-full text-left">
      <label className="block text-sm font-medium text-white" style={{ marginBottom: '10px' }}>
        {label} {required && <span className="text-white/40">*</span>}
      </label>
      <div className="relative flex items-center">
        <input
          ref={ref}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className={`bg-white/5 border rounded-xl h-12 px-4 text-white placeholder:text-white/20 focus:ring-2 focus:outline-none w-full text-sm transition-colors ${
            error
              ? 'border-red-500 focus:ring-red-500/30'
              : 'border-white/10 focus:border-white/30 focus:ring-white/20'
          }`}
        />
        {rightElement && (
          <div className="absolute right-3.5 flex items-center">
            {rightElement}
          </div>
        )}
      </div>
      {error ? (
        <p className="text-xs text-red-400" style={{ marginTop: '8px' }}>{error}</p>
      ) : helperText ? (
        <p className="text-xs text-white/40" style={{ marginTop: '8px' }}>{helperText}</p>
      ) : null}
    </div>
  );
});
