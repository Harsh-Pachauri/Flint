import React, { useState } from 'react';
import '../../styles/onboarding.css';
import { postJSON, API_BASE, getAuthToken, setOnboardingCompleteState, clearAuthTokens } from '../../utils/api';

// Mapping functions to transform frontend data to backend payload
function mapGender(gender: string): string {
  const map: Record<string, string> = {
    'Man': 'male',
    'Woman': 'female',
    'Non-binary': 'other'
  };
  return map[gender] || 'other';
}

function mapGenderPreference(pref: string): string {
  const map: Record<string, string> = {
    'Men': 'male',
    'Women': 'female',
    'Everyone': 'both'
  };
  return map[pref] || 'both';
}

function mapDatingIntent(intent: string): string {
  const map: Record<string, string> = {
    'Something real': 'something_real',
    'See where it goes': 'see_where_it_goes',
    'Campus friends first': 'campus_friends_first'
  };
  return map[intent] || 'see_where_it_goes';
}

interface OnboardingData {
  college?: string;
  collegeEmail?: string;
  verificationCode?: string;
  firstName?: string;
  age?: number;
  year?: string;
  department?: string;
  gender?: string;
  hometown?: string;
  photos?: string[];
  photoPreviews?: string[];
  photoFiles?: File[];
  interests?: string[];
  traits?: string[];
  vibe?: Record<string, number>;
  datingType?: string;
  genderPreference?: string;
}

const Onboarding: React.FC = () => {
  const [curScreen, setCurScreen] = useState(0);
  const [data, setData] = useState<OnboardingData>({});
  const [selectedInterests, setSelectedInterests] = useState<string[]>([]);
  const [selectedTraits, setSelectedTraits] = useState<string[]>([]);

  const interests = [
    { label: 'Film Photography', color: 'spark' },
    { label: 'Indie Films', color: 'vio' },
    { label: 'Lo-fi Music', color: 'rose' },
    { label: 'Chess', color: 'sky' },
    { label: 'Reading', color: 'vio' },
    { label: 'Night Drives', color: 'spark' },
    { label: 'Cooking', color: 'amber' },
    { label: 'Café Hopping', color: 'rose' },
    { label: 'Sketching', color: 'vio' },
    { label: 'Gaming', color: 'sky' },
    { label: 'Coding Projects', color: 'spark' },
    { label: 'Dance', color: 'rose' },
    { label: 'Drama Club', color: 'amber' },
    { label: 'Cricket', color: 'sky' },
    { label: 'Badminton', color: 'vio' },
    { label: 'Trekking', color: 'spark' },
    { label: 'Anime', color: 'rose' },
    { label: 'Memes', color: 'amber' },
    { label: 'Poetry', color: 'vio' },
    { label: 'Astrophysics', color: 'sky' },
  ];

  const traits = ['Night owl', 'Morning person', 'Overthinker', 'Go with the flow', 'Loyal', 'Flaky sometimes', 'Creative', 'Analytical', 'Romantic', 'Practical', 'Talkative', 'More of a listener', 'Foodie', 'Fitness freak', 'Movie buff', 'Bookworm', 'Meme lord', 'Deep convos only'];

  const colorMap: Record<string, string> = {
    spark: 'p-spark',
    vio: 'p-vio',
    rose: 'p-rose',
    sky: 'p-sky',
    amber: 'p-amber',
  };

  const getColorClass = (color: string, selected: boolean) => {
    if (!selected) return colorMap[color] || 'p-vio';
    const selMap: Record<string, string> = {
      spark: 'pill-spark-sel',
      vio: 'pill-vio-sel',
      rose: 'pill-rose-sel',
      sky: 'pill-sky-sel',
    };
    return selMap[color] || 'pill-vio-sel';
  };

  const handleScreenChange = (next: number) => {
    setCurScreen(Math.max(0, Math.min(next, 7)));
  };

  const updateData = (key: string, value: any) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  const updateSliderLabel = (val: number, idx: number) => {
    const labels: Array<Record<number, string>> = [
      { 0: 'Full introvert', 25: 'Leaning introvert', 50: 'Balanced', 75: 'Leaning extrovert', 100: 'Full extrovert' },
      { 0: 'Very chill', 33: 'Mostly chill', 50: 'Balanced', 66: 'Leaning intense', 100: 'Very intense' },
      { 0: 'Total homebody', 33: 'Mostly homebody', 50: 'Balanced', 66: 'Leaning adventurous', 100: 'Full explorer' },
    ];
    const pairs = Object.keys(labels[idx]).map((k) => [parseInt(k), labels[idx][parseInt(k) as keyof typeof labels[number]]]);
    let label = 'Balanced';
    for (let i = 0; i < pairs.length - 1; i++) {
      if (val <= (pairs[i + 1][0] as number)) {
        label = pairs[i][1] as string;
        break;
      }
      if (i === pairs.length - 2) label = pairs[i + 1][1] as string;
    }
    return label;
  };

  const progressPercent = ((curScreen + 1) / 8) * 100;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative', overflow: 'hidden', background: 'var(--void)' }}>
      {curScreen === 0 && <Screen0 onNext={() => handleScreenChange(1)} />}
      {curScreen === 1 && (
        <Screen1 onNext={() => handleScreenChange(2)} onBack={() => handleScreenChange(0)} onDataChange={updateData} />
      )}
      {curScreen === 2 && (
        <Screen2 onNext={() => handleScreenChange(3)} onBack={() => handleScreenChange(1)} onDataChange={updateData} data={data} />
      )}
      {curScreen === 3 && (
        <Screen3 onNext={() => handleScreenChange(4)} onBack={() => handleScreenChange(2)} onDataChange={updateData} data={data} />
      )}
      {curScreen === 4 && (
        <Screen4
          onNext={() => handleScreenChange(5)}
          onBack={() => handleScreenChange(3)}
          interests={interests}
          colorMap={colorMap}
          getColorClass={getColorClass}
          selectedInterests={selectedInterests}
          setSelectedInterests={setSelectedInterests}
        />
      )}
      {curScreen === 5 && (
        <Screen5
          onNext={() => handleScreenChange(6)}
          onBack={() => handleScreenChange(4)}
          traits={traits}
          selectedTraits={selectedTraits}
          setSelectedTraits={setSelectedTraits}
          updateSliderLabel={updateSliderLabel}
          onDataChange={updateData}
        />
      )}
      {curScreen === 6 && (
        <Screen6 onNext={() => handleScreenChange(7)} onBack={() => handleScreenChange(5)} onDataChange={updateData} />
      )}
      {curScreen === 7 && (
        <Screen7 
          onBack={() => handleScreenChange(6)} 
          allData={data}
          selectedInterests={selectedInterests}
          selectedTraits={selectedTraits}
          sliders={[data.vibe?.introvert || 30, data.vibe?.chill || 65, data.vibe?.homebody || 55]}
        />
      )}

      {/* Progress bar */}
      {curScreen > 0 && curScreen < 8 && (
        <div style={{ position: 'absolute', top: 24, left: 24, right: 24, maxWidth: 480, margin: '0 auto', width: 'calc(100% - 48px)' }}>
          <div style={{ height: 3, background: 'var(--s2)', borderRadius: 100, overflow: 'hidden', marginBottom: 32 }}>
            <div style={{ height: '100%', background: 'linear-gradient(90deg, var(--spark), var(--vio))', width: `${progressPercent}%`, transition: 'width 0.5s cubic-bezier(0.16, 1, 0.3, 1)' }} />
          </div>
        </div>
      )}
    </div>
  );
};

const Screen0: React.FC<{ onNext: () => void }> = ({ onNext }) => {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', width: 600, height: 600, top: -150, right: -120, borderRadius: '50%', background: 'radial-gradient(circle, rgba(224, 48, 192, 0.08) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', width: 500, height: 500, bottom: -100, left: -100, borderRadius: '50%', background: 'radial-gradient(circle, rgba(139, 92, 246, 0.07) 0%, transparent 70%)', filter: 'blur(100px)', pointerEvents: 'none' }} />

      <div style={{ animation: 'fadeUp 0.5s 0.1s ease both', position: 'relative', zIndex: 1 }}>
        <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 52, letterSpacing: '-0.05em', color: 'var(--t1)', lineHeight: 1, marginBottom: 6 }}>
          FL<span style={{ background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>INT</span>
        </div>
        <div style={{ fontFamily: 'var(--f3)', fontSize: 10, color: 'var(--t3)', letterSpacing: '0.2em', marginBottom: 48 }}>
          COLLEGE · FIRST · DATING
        </div>
      </div>

      <div style={{ animation: 'fadeUp 0.5s 0.25s ease both', maxWidth: 320, marginBottom: 48, position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 32, letterSpacing: '-0.04em', lineHeight: 1.05, color: 'var(--t1)', marginBottom: 14 }}>
          Your campus.<br />
          Your people.<br />
          <span style={{ background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Your match.</span>
        </h1>
        <p style={{ fontFamily: 'var(--f2)', fontSize: 14, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75 }}>
          Only verified students from your college. No strangers, no guessing — just real people who share your world.
        </p>
      </div>

      <div style={{ animation: 'fadeUp 0.5s 0.4s ease both', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
        <button className="btn-primary" onClick={onNext} style={{ width: '100%' }}>
          Get started →
        </button>
        <button
          className="btn-ghost"
          onClick={() => {
            clearAuthTokens();
            window.location.hash = '#/login';
          }}
          style={{ width: '100%' }}
        >
          I already have an account
        </button>
      </div>

      <div style={{ animation: 'fadeUp 0.5s 0.55s ease both', marginTop: 28, display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: 'var(--t1)' }}>4,200+</div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em' }}>STUDENTS</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: 'var(--t1)' }}>83%</div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em' }}>MATCH RATE</div>
        </div>
        <div style={{ width: 1, background: 'var(--border)' }} />
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 18, color: 'var(--t1)' }}>12</div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em' }}>CAMPUSES</div>
        </div>
      </div>
    </div>
  );
};

const Screen1: React.FC<{ onNext: () => void; onBack: () => void; onDataChange: (key: string, value: any) => void }> = ({ onNext, onBack, onDataChange }) => {
  const [college, setCollege] = useState('');
  const [collegeEmail, setCollegeEmail] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [code, setCode] = useState('');

  const handleSendCode = () => {
    if (!collegeEmail) return;
    setShowVerify(true);
  };

  const handleCodeChange = (val: string) => {
    setCode(val);
    if (val.length === 6) {
      onDataChange('college', college);
      onDataChange('collegeEmail', collegeEmail);
      onDataChange('verificationCode', val);
      setTimeout(onNext, 300);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 480, margin: '0 auto', width: '100%', overflow: 'auto', paddingTop: 80 }}>
      <div className="ey" style={{ marginBottom: 14 }}>Step 1 of 7</div>
      <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 8 }}>Verify your college.</h2>
      <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 28 }}>
        We only let in real students. Pick your college and we'll send a verification code to your official email.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>YOUR COLLEGE</div>
          <select className="inp" value={college} onChange={(e) => setCollege(e.target.value)}>
            <option value="">Select your college...</option>
            <option value="vit">VIT Vellore</option>
            <option value="bits">BITS Pilani</option>
            <option value="nit">NIT Trichy</option>
            <option value="iitb">IIT Bombay</option>
            <option value="iitd">IIT Delhi</option>
            <option value="manipal">Manipal University</option>
          </select>
        </div>
        <div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>COLLEGE EMAIL</div>
          <input className="inp" type="email" placeholder="yourname@vit.ac.in" value={collegeEmail} onChange={(e) => setCollegeEmail(e.target.value)} />
        </div>

        {showVerify && (
          <div style={{ background: 'var(--spd)', border: '1px solid rgba(224, 48, 192, 0.2)', borderRadius: 12, padding: 14 }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.08em', marginBottom: 8 }}>VERIFICATION CODE SENT</div>
            <input
              className="inp"
              type="text"
              placeholder="Enter 6-digit code"
              maxLength={6}
              value={code}
              onChange={(e) => handleCodeChange(e.target.value)}
              style={{ letterSpacing: '0.2em', fontSize: 18, textAlign: 'center' }}
            />
          </div>
        )}

        {!showVerify ? (
          <button className="btn-primary" onClick={handleSendCode}>
            Send verification code
          </button>
        ) : (
          <button className="btn-ghost" onClick={handleSendCode}>
            Resend code
          </button>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0', marginBottom: 12 }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
        <span style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)' }}>OR</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>

      <button className="btn-ghost" style={{ marginBottom: 20 }}>
        Upload student ID instead
      </button>

      <button className="btn-ghost" onClick={onBack}>
        Back
      </button>
    </div>
  );
};

const Screen2: React.FC<{ onNext: () => void; onBack: () => void; onDataChange: (key: string, value: any) => void; data: OnboardingData }> = ({
  onNext,
  onBack,
  onDataChange,
  data,
}) => {
  const [firstName, setFirstName] = useState(data.firstName || '');
  const [age, setAge] = useState(data.age?.toString() || '');
  const [year, setYear] = useState(data.year || '');
  const [department, setDepartment] = useState(data.department || '');
  const [gender, setGender] = useState(data.gender || '');
  const [hometown, setHometown] = useState(data.hometown || '');

  const handleNext = () => {
    onDataChange('firstName', firstName);
    onDataChange('age', parseInt(age) || 0);
    onDataChange('year', year);
    onDataChange('department', department);
    onDataChange('gender', gender);
    onDataChange('hometown', hometown);
    onNext();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 480, margin: '0 auto', width: '100%', overflow: 'auto', paddingTop: 80 }}>
      <div className="ey" style={{ marginBottom: 14 }}>Step 2 of 7</div>
      <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 8 }}>The basics.</h2>
      <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 28 }}>
        Quick stuff first — your name, age, and how you identify.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>FIRST NAME</div>
          <input className="inp" type="text" placeholder="What do people call you?" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>AGE</div>
            <input className="inp" type="number" placeholder="18" min="18" max="26" value={age} onChange={(e) => setAge(e.target.value)} />
          </div>
          <div>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>YEAR</div>
            <select className="inp" value={year} onChange={(e) => setYear(e.target.value)}>
              <option value="">Year...</option>
              <option>1st year</option>
              <option>2nd year</option>
              <option>3rd year</option>
              <option>4th year</option>
            </select>
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>DEPARTMENT</div>
          <select className="inp" value={department} onChange={(e) => setDepartment(e.target.value)}>
            <option value="">Select your department...</option>
            <option>CSE / IT</option>
            <option>ECE / EEE</option>
            <option>Mechanical</option>
            <option>Civil</option>
            <option>Chemical</option>
            <option>MBA / Management</option>
          </select>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 8 }}>GENDER</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {['Man', 'Woman', 'Non-binary'].map((g) => (
              <div
                key={g}
                className={`trait-opt ${gender === g ? 'sel' : ''}`}
                onClick={() => setGender(g)}
                style={{ cursor: 'pointer', padding: '12px 14px', background: 'var(--s2)', border: '1.5px solid var(--border)', borderRadius: 12, textAlign: 'center' }}
              >
                <div style={{ fontSize: 20, marginBottom: 6 }}>{g === 'Man' ? '👨' : g === 'Woman' ? '👩' : '🌈'}</div>
                <div style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>{g}</div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 6 }}>HOMETOWN</div>
          <input className="inp" type="text" placeholder="Where are you from?" value={hometown} onChange={(e) => setHometown(e.target.value)} />
        </div>

        <button className="btn-primary" onClick={handleNext} style={{ marginTop: 8 }}>
          Continue →
        </button>
        <button className="btn-ghost" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
};

const Screen3: React.FC<{ onNext: () => void; onBack: () => void; onDataChange: (key: string, value: any) => void; data: OnboardingData }> = ({ onNext, onBack, onDataChange, data }) => {
  type SlotStatus = 'idle' | 'ready' | 'error';
  type PhotoSlot = {
    previewUrl: string;
    file: File | null;
    status: SlotStatus;
    error: string;
  };

  const buildInitialSlots = (): PhotoSlot[] => {
    const existingPreviews = Array.isArray(data.photoPreviews) ? data.photoPreviews : [];
    return Array.from({ length: 6 }, (_, i) => {
      const preview = existingPreviews[i] || '';
      return {
        previewUrl: preview,
        file: null,
        status: preview ? 'ready' : 'idle',
        error: '',
      };
    });
  };

  const [slots, setSlots] = useState<PhotoSlot[]>(buildInitialSlots);
  const [screenError, setScreenError] = useState<string>('');

  const persistSelections = (nextSlots: PhotoSlot[]) => {
    const previews = nextSlots.map((s) => s.previewUrl).filter(Boolean);
    const files = nextSlots.map((s) => s.file).filter(Boolean) as File[];
    onDataChange('photoPreviews', previews);
    onDataChange('photoFiles', files);
  };

  const openPickerForSlot = (index: number) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      handleFileSelected(file, index);
    };
    input.click();
  };

  const clearSlot = (index: number) => {
    setSlots((prev) => {
      const next = [...prev];
      next[index] = {
        previewUrl: '',
        file: null,
        status: 'idle',
        error: '',
      };
      persistSelections(next);
      return next;
    });
  };

  function handleFileSelected(file: File | null | undefined, index: number) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const previewUrl = String(reader.result || '');
      setSlots((prev) => {
        const next = [...prev];
        next[index] = {
          previewUrl,
          file,
          status: 'ready',
          error: '',
        };
        persistSelections(next);
        return next;
      });
      setScreenError('');
    };
    reader.onerror = () => {
      setSlots((prev) => {
        const next = [...prev];
        next[index] = {
          previewUrl: '',
          file: null,
          status: 'error',
          error: 'Could not read this image',
        };
        persistSelections(next);
        return next;
      });
    };
    reader.readAsDataURL(file);
  }

  const selectedCount = slots.filter((slot) => slot.status === 'ready').length;

  const handleContinue = () => {
    if (selectedCount < 1) {
      setScreenError('Select at least 1 photo before continuing.');
      return;
    }
    setScreenError('');
    onNext();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 520, margin: '0 auto', width: '100%', overflow: 'auto', paddingTop: 80 }}>
      <div className="ey" style={{ marginBottom: 14 }}>Step 3 of 7</div>
      <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 8 }}>Show up.</h2>
      <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 24 }}>
        Add at least 2 photos. Real ones — your campus crew already knows what you look like anyway.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 20 }}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} onClick={() => openPickerForSlot(i)} className={`photo-slot ${slots[i]?.previewUrl ? 'filled' : ''}`} style={{ position: 'relative', overflow: 'hidden', cursor: 'pointer' }}>
            {slots[i]?.previewUrl ? (
              <img src={slots[i].previewUrl} alt={`photo-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
                {i >= 2 ? (
                  <>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style={{ position: 'relative', zIndex: 1 }}>
                      <path d="M12 5v14M5 12h14" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    <span style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', marginTop: 6, letterSpacing: '0.06em', position: 'relative', zIndex: 1 }}>
                      ADD PHOTO
                    </span>
                  </>
                ) : (
                  <div style={{ fontFamily: 'var(--f3)', fontSize: 12, color: 'var(--t3)' }}>Click to add</div>
                )}
              </div>
            )}

            {i === 0 && (
              <div style={{ position: 'absolute', bottom: 8, left: 8, background: 'var(--spark)', color: '#fff', fontFamily: 'var(--f3)', fontSize: 8, padding: '3px 8px', borderRadius: 100, letterSpacing: '0.05em', zIndex: 2 }}>
                MAIN
              </div>
            )}

            {slots[i]?.status === 'ready' ? (
              <div style={{ position: 'absolute', top: 8, right: 8, background: '#22c55e', color: '#fff', borderRadius: 999, padding: '2px 8px', fontFamily: 'var(--f3)', fontSize: 8, letterSpacing: '0.06em', zIndex: 2 }}>
                READY
              </div>
            ) : null}

            {(slots[i]?.status === 'ready' || slots[i]?.status === 'error') ? (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(0,0,0,0.3)', color: '#fff', zIndex: 3 }}>
                {slots[i]?.error ? (
                  <span style={{ fontFamily: 'var(--f3)', fontSize: 8, letterSpacing: '0.04em', textAlign: 'center', padding: '0 8px' }}>{slots[i].error}</span>
                ) : null}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSlot(i);
                  }}
                  style={{ border: '1px solid rgba(255,255,255,0.7)', color: '#fff', background: 'transparent', borderRadius: 999, padding: '4px 10px', fontFamily: 'var(--f3)', fontSize: 9, letterSpacing: '0.06em', cursor: 'pointer' }}
                >
                  CANCEL
                </button>
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--f3)', fontSize: 10, color: selectedCount >= 1 ? '#22c55e' : 'var(--t3)', marginBottom: 10, letterSpacing: '0.04em' }}>
        {selectedCount} photo{selectedCount === 1 ? '' : 's'} selected
      </div>

      {screenError ? (
        <div style={{ background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.35)', color: '#fecaca', borderRadius: 10, padding: '10px 12px', fontFamily: 'var(--f2)', fontSize: 12, marginBottom: 12 }}>
          {screenError}
        </div>
      ) : null}

      <div style={{ background: 'var(--s2)', borderRadius: 12, padding: '12px 14px', border: '1px solid var(--border)', marginBottom: 20 }}>
        <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.08em', marginBottom: 6 }}>PHOTO TIPS</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--f2)', fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>Clear face shot as your main photo</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--f2)', fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>Show your personality — clubs, events, hangouts</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <div style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--rose)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--f2)', fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>No sunglasses in main photo — people want to see you</span>
          </div>
        </div>
      </div>

      <button className="btn-primary" onClick={handleContinue} disabled={selectedCount < 1} style={{ opacity: selectedCount < 1 ? 0.7 : 1 }}>
        Continue →
      </button>
      <button className="btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
        Back
      </button>
    </div>
  );
};

const Screen4: React.FC<{
  onNext: () => void;
  onBack: () => void;
  interests: any[];
  colorMap: Record<string, string>;
  getColorClass: (color: string, selected: boolean) => string;
  selectedInterests: string[];
  setSelectedInterests: (interests: string[]) => void;
}> = ({ onNext, onBack, interests, colorMap, getColorClass, selectedInterests, setSelectedInterests }) => {
  const toggleInterest = (label: string) => {
    if (selectedInterests.includes(label)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== label));
    } else {
      setSelectedInterests([...selectedInterests, label]);
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 520, margin: '0 auto', width: '100%', overflow: 'auto', paddingTop: 80 }}>
      <div className="ey" style={{ marginBottom: 14 }}>Step 4 of 7</div>
      <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 8 }}>What are you into?</h2>
      <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 8 }}>
        Pick at least 5. This is how we find your people — the ones who'll actually get you.
      </p>
      <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: selectedInterests.length >= 5 ? '#22c55e' : 'var(--t3)', letterSpacing: '0.06em', marginBottom: 18 }}>
        {selectedInterests.length} / 5 minimum selected
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
        {interests.map((int) => (
          <span
            key={int.label}
            className={`pill ${selectedInterests.includes(int.label) ? getColorClass(int.color, true) : colorMap[int.color]}`}
            onClick={() => toggleInterest(int.label)}
            style={{ fontSize: 10, padding: '5px 13px', cursor: 'pointer', transform: selectedInterests.includes(int.label) ? 'scale(1.05)' : 'scale(1)' }}
          >
            {int.label}
          </span>
        ))}
      </div>

      <button className="btn-primary" onClick={onNext} style={{ opacity: selectedInterests.length >= 5 ? 1 : 0.5 }} disabled={selectedInterests.length < 5}>
        Continue →
      </button>
      <button className="btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
        Back
      </button>
    </div>
  );
};

const Screen5: React.FC<{
  onNext: () => void;
  onBack: () => void;
  traits: string[];
  selectedTraits: string[];
  setSelectedTraits: (traits: string[]) => void;
  updateSliderLabel: (val: number, idx: number) => string;
  onDataChange?: (key: string, value: any) => void;
}> = ({ onNext, onBack, traits, selectedTraits, setSelectedTraits, updateSliderLabel, onDataChange }) => {
  const [sliders, setSliders] = useState([30, 65, 55]);

  const toggleTrait = (label: string) => {
    if (selectedTraits.includes(label)) {
      setSelectedTraits(selectedTraits.filter((t) => t !== label));
    } else {
      setSelectedTraits([...selectedTraits, label]);
    }
  };

  const handleNext = () => {
    if (onDataChange) {
      onDataChange('vibe', { introvert: sliders[0], chill: sliders[1], homebody: sliders[2] });
    }
    onNext();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 520, margin: '0 auto', width: '100%', overflow: 'auto', paddingTop: 80 }}>
      <div className="ey" style={{ marginBottom: 14 }}>Step 5 of 7</div>
      <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 8 }}>Who are you, really?</h2>
      <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 24 }}>
        Pick the traits that actually describe you — not the ideal version of you. Honest profiles get better matches.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
        {[
          { label1: 'INTROVERT', label2: 'EXTROVERT', idx: 0 },
          { label1: 'VERY CHILL', label2: 'VERY INTENSE', idx: 1 },
          { label1: 'HOMEBODY', label2: 'ADVENTUROUS', idx: 2 },
        ].map((slider) => (
          <div key={slider.idx}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t2)', letterSpacing: '0.07em' }}>{slider.label1}</div>
              <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t2)', letterSpacing: '0.07em' }}>{slider.label2}</div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={sliders[slider.idx]}
              onChange={(e) => {
                const newSliders = [...sliders];
                newSliders[slider.idx] = parseInt(e.target.value);
                setSliders(newSliders);
              }}
              style={{ width: '100%', height: 4, borderRadius: 100, background: 'linear-gradient(to right, var(--spark), var(--vio))', outline: 'none', cursor: 'pointer' }}
            />
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', textAlign: 'center', marginTop: 5, letterSpacing: '0.06em' }}>
              {updateSliderLabel(sliders[slider.idx], slider.idx)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 10 }}>PICK YOUR VIBE WORDS</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 24 }}>
        {traits.map((trait) => (
          <span
            key={trait}
            className={`pill ${selectedTraits.includes(trait) ? 'pill-vio-sel' : 'p-vio'}`}
            onClick={() => toggleTrait(trait)}
            style={{ fontSize: 10, padding: '5px 13px', cursor: 'pointer', transform: selectedTraits.includes(trait) ? 'scale(1.05)' : 'scale(1)' }}
          >
            {trait}
          </span>
        ))}
      </div>

      <button className="btn-primary" onClick={handleNext}>
        Continue →
      </button>
      <button className="btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
        Back
      </button>
    </div>
  );
};

const Screen6: React.FC<{ onNext: () => void; onBack: () => void; onDataChange: (key: string, value: any) => void }> = ({ onNext, onBack, onDataChange }) => {
  const [datingType, setDatingType] = useState('Something real');
  const [preference, setPreference] = useState('Women');

  const handleNext = () => {
    onDataChange('datingType', datingType);
    onDataChange('genderPreference', preference);
    onNext();
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '24px', maxWidth: 480, margin: '0 auto', width: '100%', overflow: 'auto', paddingTop: 80 }}>
      <div className="ey" style={{ marginBottom: 14 }}>Step 6 of 7</div>
      <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 28, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 8 }}>What are you here for?</h2>
      <p style={{ fontFamily: 'var(--f2)', fontSize: 13, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, marginBottom: 24 }}>
        Be honest — it filters your matches so nobody wastes each other's time.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
        {[
          { emoji: '💞', title: 'Something real', desc: 'Looking for a proper relationship' },
          { emoji: '✨', title: 'See where it goes', desc: 'Open to it turning into something' },
          { emoji: '🤝', title: 'Campus friends first', desc: 'Prefer to start as friends' },
        ].map((opt) => (
          <div
            key={opt.title}
            className={`dating-opt ${datingType === opt.title ? 'sel' : ''}`}
            onClick={() => setDatingType(opt.title)}
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12 }}
          >
            <div style={{ fontSize: 24 }}>{opt.emoji}</div>
            <div>
              <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 14, color: 'var(--t1)', marginBottom: 2 }}>{opt.title}</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: 11, fontWeight: 300, color: 'var(--t2)' }}>{opt.desc}</div>
            </div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', letterSpacing: '0.08em', marginBottom: 10 }}>I'M INTERESTED IN</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 20 }}>
          {[
            { label: 'Women', emoji: '👩' },
            { label: 'Men', emoji: '👨' },
            { label: 'Everyone', emoji: '🌈' },
          ].map((pref) => (
            <div
              key={pref.label}
              className={`trait-opt ${preference === pref.label ? 'sel' : ''}`}
              onClick={() => setPreference(pref.label)}
              style={{ cursor: 'pointer', padding: '12px 14px', background: 'var(--s2)', border: '1.5px solid var(--border)', borderRadius: 12, textAlign: 'center' }}
            >
              <div style={{ fontSize: 18, marginBottom: 5 }}>{pref.emoji}</div>
              <div style={{ fontFamily: 'var(--f2)', fontSize: 12, fontWeight: 500, color: 'var(--t1)' }}>{pref.label}</div>
            </div>
          ))}
        </div>
      </div>

      <button className="btn-primary" onClick={handleNext}>
        Continue →
      </button>
      <button className="btn-ghost" onClick={onBack} style={{ marginTop: 8 }}>
        Back
      </button>
    </div>
  );
};

const Screen7: React.FC<{ onBack: () => void; allData?: OnboardingData; selectedInterests?: string[]; selectedTraits?: string[]; sliders?: number[] }> = ({ onBack, allData, selectedInterests = [], selectedTraits = [], sliders = [30, 65, 55] }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitMessage, setSubmitMessage] = useState('');

  const handleStartJourney = async () => {
    if (!allData?.firstName || !allData?.age || !allData?.gender || !allData?.datingType || !allData?.genderPreference) {
      setError('Missing required profile information');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSubmitMessage('Setting up your profile...');

    try {
      // Transform frontend data to backend payload
      const payload = {
        name: allData.firstName,
        age: Number(allData.age),
        gender: mapGender(allData.gender),
        genderPreference: mapGenderPreference(allData.genderPreference),
        datingType: mapDatingIntent(allData.datingType),
        year: allData.year ? parseInt(allData.year.split(' ')[0]) : null,
        depart: allData.department || '',
        photos: Array.isArray(allData.photos) ? allData.photos : [],
        interests: selectedInterests,
        personality: {
          introvertExtrovert: sliders[0],
          chillIntense: sliders[1],
          homebodyAdventurous: sliders[2],
          traits: selectedTraits
        },
        vibewords: selectedTraits
      };

      let profileReady = false;
      try {
        const response = await postJSON('/api/profile', payload);
        profileReady = !!response.profileId;
      } catch (err: any) {
        const msg = err?.error || err?.message || '';
        if (/already exists/i.test(String(msg))) {
          profileReady = true;
        } else {
          throw err;
        }
      }

      if (!profileReady) {
        throw new Error('Failed to create profile');
      }

      const selectedFiles = Array.isArray(allData?.photoFiles) ? allData.photoFiles : [];
      if (selectedFiles.length > 0) {
        setSubmitMessage('Uploading photos...');
        const token = getAuthToken();

        for (const file of selectedFiles) {
          const fd = new FormData();
          fd.append('photos', file);

          const res = await fetch(`${API_BASE}/api/profile/photos`, {
            method: 'POST',
            headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            body: fd,
          });
          const json = await res.json().catch(() => ({}));
          if (!res.ok) {
            throw new Error(json?.error || 'Photo upload failed');
          }

          const newUrl = Array.isArray(json?.uploadedUrls)
            ? json.uploadedUrls.map((item: any) => item?.url).filter(Boolean)[0]
            : '';
          if (!newUrl) {
            throw new Error('Photo upload succeeded but no URL was returned');
          }
        }
      }

      // After profile + photo uploads succeed, call onboarding complete endpoint
      try {
        await postJSON('/api/onboarding/complete', {});
      } catch (e: any) {
        throw new Error(e?.error || e?.message || 'Failed to finalize onboarding');
      }

      try {
        setOnboardingCompleteState(true);
        localStorage.setItem('onboarded', '1');
      } catch (e) {}
      setTimeout(() => {
        window.location.hash = '#/';
      }, 500);
    } catch (err: any) {
      setError(err?.message || 'Error creating profile. Please try again.');
      console.error('Profile creation error:', err);
    } finally {
      setIsSubmitting(false);
      setSubmitMessage('');
    }
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 24px', textAlign: 'center', position: 'relative', minHeight: '100vh' }}>
      <div style={{ position: 'absolute', width: 500, height: 500, top: '50%', left: '50%', transform: 'translate(-50%, -50%)', borderRadius: '50%', background: 'radial-gradient(circle, rgba(224, 48, 192, 0.1) 0%, transparent 60%)', filter: 'blur(80px)', pointerEvents: 'none' }} />

      <div style={{ animation: 'fadeUp 0.5s ease both', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 60, marginBottom: 24, animation: 'pulse 2s ease-in-out infinite' }}>✨</div>
        <h2 style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 34, letterSpacing: '-0.04em', color: 'var(--t1)', marginBottom: 10 }}>
          {error ? 'Oops!' : 'You\'re in.'}
        </h2>
        {error ? (
          <p style={{ fontFamily: 'var(--f2)', fontSize: 14, fontWeight: 300, color: 'var(--rose)', lineHeight: 1.75, maxWidth: 300, margin: '0 auto 32px' }}>
            {error}
          </p>
        ) : (
          <p style={{ fontFamily: 'var(--f2)', fontSize: 14, fontWeight: 300, color: 'var(--t2)', lineHeight: 1.75, maxWidth: 300, margin: '0 auto 32px' }}>
            Your profile is live. <span style={{ color: 'var(--spark)', fontWeight: 500 }}>247 students</span> from your campus are already on FLINT.
          </p>
        )}
        {isSubmitting && submitMessage ? (
          <p style={{ fontFamily: 'var(--f3)', fontSize: 10, color: 'var(--spark)', letterSpacing: '0.08em', margin: '0 auto 14px' }}>
            {submitMessage}
          </p>
        ) : null}
      </div>

      {!error && (
        <div style={{ animation: 'fadeUp 0.5s 0.2s ease both', width: '100%', maxWidth: 340, marginBottom: 28, position: 'relative', zIndex: 1 }}>
          <div className="card" style={{ padding: 18 }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--spark)', letterSpacing: '0.1em', marginBottom: 10 }}>YOUR FIRST MATCH IS WAITING</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg, var(--spark), var(--vio))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 16, flexShrink: 0, color: '#fff' }}>
                PS
              </div>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 700, fontSize: 15, color: 'var(--t1)' }}>Priya, 20</div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>ECE · 2nd yr · VIT</div>
              </div>
              <div style={{ marginLeft: 'auto', textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--f1)', fontWeight: 800, fontSize: 22, background: 'linear-gradient(135deg, var(--spark), var(--vio))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  94%
                </div>
                <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)' }}>MATCH</div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div style={{ animation: 'fadeUp 0.5s 0.35s ease both', width: '100%', maxWidth: 320, display: 'flex', flexDirection: 'column', gap: 10, position: 'relative', zIndex: 1 }}>
        <button className="btn-primary" onClick={handleStartJourney} disabled={isSubmitting} style={{ opacity: isSubmitting ? 0.6 : 1 }}>
          {isSubmitting ? 'Setting up profile…' : 'Start discovering →'}
        </button>
        <button className="btn-ghost" onClick={onBack} disabled={isSubmitting}>
          Edit my profile first
        </button>
      </div>

      {!error && (
        <div style={{ animation: 'fadeUp 0.5s 0.5s ease both', marginTop: 20, display: 'flex', gap: 20, position: 'relative', zIndex: 1 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 4 }}>VERIFIED ID</div>
            <div style={{ color: '#22c55e', fontSize: 16 }}>✓</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 4 }}>PRIVACY ON</div>
            <div style={{ color: '#22c55e', fontSize: 16 }}>✓</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontFamily: 'var(--f3)', fontSize: 8, color: 'var(--t3)', letterSpacing: '0.07em', marginBottom: 4 }}>CAMPUS ONLY</div>
            <div style={{ color: '#22c55e', fontSize: 16 }}>✓</div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Onboarding;
