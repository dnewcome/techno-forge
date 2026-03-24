import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, Download, Plus, Trash2, Settings } from 'lucide-react';

// Base64 encoded audio samples (minimal kick, hihat, bass, noise)
const AUDIO_SAMPLES = {
  kick: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=',
  hihat: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=',
  bass: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA=',
  noise: 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAAB9AAACABAAZGF0YQAAAAA='
};

const TechnoMIDIGenerator = () => {
  const [sections, setSections] = useState([
    { id: 1, type: 'A', length: 16, color: '#00ff88' },
    { id: 2, type: 'riser', length: 4, color: '#ff3366' },
    { id: 3, type: 'B', length: 16, color: '#3366ff' }
  ]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playPosition, setPlayPosition] = useState(0);
  const [bpm, setBpm] = useState(128);
  const [selectedSection, setSelectedSection] = useState(null);
  const audioContextRef = useRef(null);
  const schedulerRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  const getTotalBars = () => sections.reduce((sum, s) => sum + s.length, 0);

  const addSection = (type) => {
    const newSection = {
      id: Date.now(),
      type,
      length: type === 'riser' ? 4 : 16,
      color: type === 'A' ? '#00ff88' : type === 'B' ? '#3366ff' : '#ff3366'
    };
    setSections([...sections, newSection]);
  };

  const deleteSection = (id) => {
    setSections(sections.filter(s => s.id !== id));
  };

  const updateSection = (id, field, value) => {
    setSections(sections.map(s => s.id === id ? { ...s, [field]: value } : s));
  };

  const generatePattern = (sectionType, barIndex, instrument) => {
    const patterns = {
      kick: {
        A: [0, 4, 8, 12],
        B: [0, 3, 6, 9, 12, 15],
        riser: [0, 2, 4, 6, 8, 10, 12, 14]
      },
      hihat: {
        A: [2, 6, 10, 14],
        B: [1, 3, 5, 7, 9, 11, 13, 15],
        riser: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      },
      bass: {
        A: [0, 8],
        B: [0, 4, 8, 12],
        riser: []
      },
      noise: {
        A: [],
        B: [7, 15],
        riser: Array.from({ length: 16 }, (_, i) => i)
      }
    };
    return patterns[instrument][sectionType] || [];
  };

  const playAudio = (time) => {
    const ctx = audioContextRef.current;
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    oscillator.frequency.value = 60;
    gainNode.gain.setValueAtTime(0.3, time);
    gainNode.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    
    oscillator.start(time);
    oscillator.stop(time + 0.1);
  };

  const scheduleNotes = () => {
    const ctx = audioContextRef.current;
    const beatDuration = 60 / bpm / 4; // 16th note duration
    let currentBar = 0;
    let currentTime = ctx.currentTime;
    startTimeRef.current = currentTime;

    sections.forEach((section) => {
      for (let bar = 0; bar < section.length; bar++) {
        const kickPattern = generatePattern(section.type, bar, 'kick');
        const hihatPattern = generatePattern(section.type, bar, 'hihat');
        
        kickPattern.forEach(step => {
          const time = currentTime + (currentBar * 16 + bar * 16 + step) * beatDuration;
          playAudio(time);
        });
        
        hihatPattern.forEach(step => {
          const time = currentTime + (currentBar * 16 + bar * 16 + step) * beatDuration;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 8000;
          gain.gain.setValueAtTime(0.1, time);
          gain.gain.exponentialRampToValueAtTime(0.01, time + 0.05);
          osc.start(time);
          osc.stop(time + 0.05);
        });
      }
      currentBar += section.length;
    });

    const totalDuration = getTotalBars() * 16 * beatDuration * 1000;
    schedulerRef.current = setInterval(() => {
      if (!audioContextRef.current) return;
      const elapsed = (audioContextRef.current.currentTime - startTimeRef.current) * 1000;
      const position = (elapsed / totalDuration) * 100;
      setPlayPosition(Math.min(position, 100));
      
      if (position >= 100) {
        setIsPlaying(false);
        setPlayPosition(0);
        clearInterval(schedulerRef.current);
      }
    }, 50);
  };

  const togglePlay = () => {
    if (isPlaying) {
      setIsPlaying(false);
      setPlayPosition(0);
      if (schedulerRef.current) {
        clearInterval(schedulerRef.current);
      }
    } else {
      setIsPlaying(true);
      scheduleNotes();
    }
  };

  const generateMIDI = () => {
    // Simplified MIDI generation
    const header = new Uint8Array([
      0x4D, 0x54, 0x68, 0x64, // "MThd"
      0x00, 0x00, 0x00, 0x06, // Header length
      0x00, 0x00, // Format type 0
      0x00, 0x01, // Number of tracks
      0x00, 0x60  // Ticks per quarter note (96)
    ]);

    const trackData = [];
    trackData.push(0x4D, 0x54, 0x72, 0x6B); // "MTrk"
    
    const events = [];
    let currentTick = 0;
    
    sections.forEach((section) => {
      const ticksPerBar = 384; // 4 beats * 96 ticks
      for (let bar = 0; bar < section.length; bar++) {
        const kickPattern = generatePattern(section.type, bar, 'kick');
        kickPattern.forEach(step => {
          const tick = currentTick + bar * ticksPerBar + step * 24;
          events.push([tick, 0x90, 36, 100]); // Note on
          events.push([tick + 12, 0x80, 36, 0]); // Note off
        });
      }
      currentTick += section.length * ticksPerBar;
    });

    events.sort((a, b) => a[0] - b[0]);
    
    let lastTick = 0;
    const trackEvents = [];
    events.forEach(([tick, ...data]) => {
      const delta = tick - lastTick;
      trackEvents.push(...encodeVariableLength(delta), ...data);
      lastTick = tick;
    });

    trackEvents.push(0x00, 0xFF, 0x2F, 0x00); // End of track
    
    const trackLength = new Uint8Array(4);
    new DataView(trackLength.buffer).setUint32(0, trackEvents.length, false);
    
    const midi = new Uint8Array([
      ...header,
      ...trackData,
      ...trackLength,
      ...trackEvents
    ]);

    const blob = new Blob([midi], { type: 'audio/midi' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'techno-track.mid';
    a.click();
  };

  const encodeVariableLength = (value) => {
    const bytes = [];
    bytes.unshift(value & 0x7F);
    value >>= 7;
    while (value > 0) {
      bytes.unshift((value & 0x7F) | 0x80);
      value >>= 7;
    }
    return bytes;
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 100%)',
      color: '#fff',
      fontFamily: '"Space Mono", monospace',
      padding: '2rem'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Orbitron:wght@900&display=swap');
        
        * { box-sizing: border-box; }
        
        .neon-text {
          font-family: 'Orbitron', sans-serif;
          font-size: 3rem;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          background: linear-gradient(90deg, #00ff88, #00ddff, #ff3366);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
          text-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
          margin-bottom: 3rem;
          animation: glitch 3s infinite;
        }
        
        @keyframes glitch {
          0%, 100% { transform: translate(0); }
          20% { transform: translate(-2px, 2px); }
          40% { transform: translate(-2px, -2px); }
          60% { transform: translate(2px, 2px); }
          80% { transform: translate(2px, -2px); }
        }
        
        .control-btn {
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid #00ff88;
          color: #00ff88;
          padding: 0.75rem 1.5rem;
          border-radius: 4px;
          cursor: pointer;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.3s ease;
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
        }
        
        .control-btn:hover {
          background: rgba(0, 255, 136, 0.2);
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.5);
          transform: translateY(-2px);
        }
        
        .control-btn.primary {
          border-color: #ff3366;
          color: #ff3366;
        }
        
        .control-btn.primary:hover {
          background: rgba(255, 51, 102, 0.2);
          box-shadow: 0 0 20px rgba(255, 51, 102, 0.5);
        }
        
        .section-card {
          background: rgba(255, 255, 255, 0.03);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          transition: all 0.3s ease;
          cursor: pointer;
        }
        
        .section-card:hover {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.2);
          transform: translateX(4px);
        }
        
        .section-card.selected {
          border-color: #00ff88;
          box-shadow: 0 0 20px rgba(0, 255, 136, 0.3);
        }
        
        input[type="number"], input[type="color"] {
          background: rgba(0, 0, 0, 0.5);
          border: 1px solid rgba(255, 255, 255, 0.2);
          color: #fff;
          padding: 0.5rem;
          border-radius: 4px;
          font-family: 'Space Mono', monospace;
        }
        
        input[type="number"]:focus, input[type="color"]:focus {
          outline: none;
          border-color: #00ff88;
        }
        
        .timeline {
          position: relative;
          height: 200px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 8px;
          overflow: hidden;
          margin: 2rem 0;
        }
        
        .play-indicator {
          position: absolute;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #ff3366;
          box-shadow: 0 0 10px #ff3366;
          transition: left 0.05s linear;
          z-index: 10;
        }
        
        .note-grid {
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          display: grid;
          grid-template-rows: repeat(4, 1fr);
          gap: 2px;
          padding: 0.5rem;
        }
        
        .instrument-row {
          background: rgba(255, 255, 255, 0.02);
          border-radius: 4px;
          position: relative;
          display: flex;
          align-items: center;
        }
        
        .instrument-label {
          position: absolute;
          left: 0.5rem;
          font-size: 0.7rem;
          color: rgba(255, 255, 255, 0.5);
          z-index: 5;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        
        .note {
          position: absolute;
          height: 60%;
          top: 20%;
          background: currentColor;
          border-radius: 2px;
          opacity: 0.8;
          animation: pulse 0.5s ease-in-out;
        }
        
        @keyframes pulse {
          0%, 100% { opacity: 0.8; }
          50% { opacity: 1; transform: scaleY(1.1); }
        }
      `}</style>

      <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
        <h1 className="neon-text">Techno Forge</h1>

        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          marginBottom: '2rem',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button onClick={togglePlay} className="control-btn primary">
            {isPlaying ? <Pause size={20} /> : <Play size={20} />}
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <button onClick={generateMIDI} className="control-btn">
            <Download size={20} />
            Export MIDI
          </button>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <Settings size={16} />
            <label style={{ fontSize: '0.9rem' }}>BPM:</label>
            <input
              type="number"
              value={bpm}
              onChange={(e) => setBpm(parseInt(e.target.value) || 128)}
              min="60"
              max="200"
              style={{ width: '80px' }}
            />
          </div>
        </div>

        <div className="timeline">
          <div className="play-indicator" style={{ left: `${playPosition}%` }} />
          <div className="note-grid">
            {['kick', 'hihat', 'bass', 'noise'].map((instrument, idx) => (
              <div key={instrument} className="instrument-row">
                <span className="instrument-label">{instrument}</span>
                {sections.map((section, sIdx) => {
                  const startPercent = sections.slice(0, sIdx).reduce((sum, s) => sum + s.length, 0) / getTotalBars() * 100;
                  const widthPercent = section.length / getTotalBars() * 100;
                  
                  return Array.from({ length: section.length }).map((_, barIdx) => {
                    const pattern = generatePattern(section.type, barIdx, instrument);
                    const barStartPercent = startPercent + (barIdx / section.length) * widthPercent;
                    const barWidthPercent = widthPercent / section.length;
                    
                    return pattern.map(step => (
                      <div
                        key={`${sIdx}-${barIdx}-${step}`}
                        className="note"
                        style={{
                          left: `${barStartPercent + (step / 16) * barWidthPercent}%`,
                          width: `${barWidthPercent / 20}%`,
                          color: section.color
                        }}
                      />
                    ));
                  });
                })}
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          <div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem',
              color: '#00ff88',
              textTransform: 'uppercase',
              letterSpacing: '0.2em'
            }}>Sections</h2>
            <div style={{ marginBottom: '1rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => addSection('A')} className="control-btn">
                <Plus size={16} /> Add A
              </button>
              <button onClick={() => addSection('B')} className="control-btn">
                <Plus size={16} /> Add B
              </button>
              <button onClick={() => addSection('riser')} className="control-btn">
                <Plus size={16} /> Add Riser
              </button>
            </div>
            {sections.map((section, idx) => (
              <div
                key={section.id}
                className={`section-card ${selectedSection === section.id ? 'selected' : ''}`}
                onClick={() => setSelectedSection(section.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      background: section.color,
                      borderRadius: '4px',
                      boxShadow: `0 0 15px ${section.color}40`
                    }} />
                    <div>
                      <div style={{ 
                        fontSize: '1.2rem', 
                        fontWeight: 'bold',
                        textTransform: 'uppercase'
                      }}>
                        Section {section.type}
                      </div>
                      <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                        Position: {idx + 1} | Bars: {section.length}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteSection(section.id);
                    }}
                    className="control-btn"
                    style={{ padding: '0.5rem' }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ 
                  marginTop: '1rem', 
                  display: 'grid', 
                  gridTemplateColumns: '1fr 1fr', 
                  gap: '1rem' 
                }}>
                  <div>
                    <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Length (bars)</label>
                    <input
                      type="number"
                      value={section.length}
                      onChange={(e) => updateSection(section.id, 'length', parseInt(e.target.value) || 1)}
                      min="1"
                      max="64"
                      style={{ width: '100%', marginTop: '0.25rem' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.8rem', opacity: 0.6 }}>Color</label>
                    <input
                      type="color"
                      value={section.color}
                      onChange={(e) => updateSection(section.id, 'color', e.target.value)}
                      style={{ width: '100%', marginTop: '0.25rem', height: '38px' }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div>
            <h2 style={{ 
              fontSize: '1.5rem', 
              marginBottom: '1rem',
              color: '#00ff88',
              textTransform: 'uppercase',
              letterSpacing: '0.2em'
            }}>Pattern Info</h2>
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              padding: '1.5rem'
            }}>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#00ff88', marginBottom: '0.5rem' }}>Section A Pattern</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.6' }}>
                  Kick: Four-on-the-floor (beats 1, 2, 3, 4)<br />
                  Hihat: Offbeats (2, 4)<br />
                  Bass: Root notes on 1 and 3<br />
                  Noise: Minimal
                </p>
              </div>
              <div style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ color: '#3366ff', marginBottom: '0.5rem' }}>Section B Pattern</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.6' }}>
                  Kick: Syncopated pattern<br />
                  Hihat: Eighth notes throughout<br />
                  Bass: More active bassline<br />
                  Noise: Sparse accents
                </p>
              </div>
              <div>
                <h3 style={{ color: '#ff3366', marginBottom: '0.5rem' }}>Riser Pattern</h3>
                <p style={{ fontSize: '0.9rem', opacity: 0.8, lineHeight: '1.6' }}>
                  Kick: Increasingly dense<br />
                  Hihat: Full 16th notes<br />
                  Bass: Silent (builds tension)<br />
                  Noise: Maximum density
                </p>
              </div>
              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem',
                background: 'rgba(0, 255, 136, 0.1)',
                borderRadius: '4px',
                border: '1px solid rgba(0, 255, 136, 0.3)'
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.6, marginBottom: '0.5rem' }}>
                  TOTAL TRACK LENGTH
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#00ff88' }}>
                  {getTotalBars()} bars
                </div>
                <div style={{ fontSize: '0.9rem', opacity: 0.8, marginTop: '0.25rem' }}>
                  {(getTotalBars() * 4 * 60 / bpm).toFixed(1)} seconds @ {bpm} BPM
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TechnoMIDIGenerator;
