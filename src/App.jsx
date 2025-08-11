import React, { useEffect, useState, useRef } from "react";

function App() {
  const [history, setHistory] = useState(() => generateInitialHistory(0));
  const [status, setStatus] = useState("ready"); // ready | flying | crashed
  const [multiplier, setMultiplier] = useState(1.0);
  const [predictedTarget, setPredictedTarget] = useState(null);
  const [autoCash, setAutoCash] = useState(1.80);
  const [betAmount, setBetAmount] = useState(1);
  const [balance, setBalance] = useState(100);
  const [autoCO, setAutoCO] = useState(false);
  const [co, setCo] = useState(false);
  const labelRef = useRef(null);
  const flightRef = useRef(null);
  const crashPointRef = useRef(null);

  function seededRandom(seed) {
    let s = seed % 2147483647;
    return function () {
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  function generateCrashPoint(rng) {
    const u = rng();
    const heavy = Math.pow(u, -1.2); 
    const value = Math.max(1.0, Math.min(1000, 1 + heavy * 0.1));
    return parseFloat(value.toFixed(2));
  }

  function generateInitialHistory(n) {
    const rng = seededRandom(Date.now());
    const arr = Array.from({ length: n }, (_, i) => {
      const cp = generateCrashPoint(rng);
      return { id: i + 1, crash: cp, time: Date.now() - (n - i) * 20000 };
    });
    return arr;
  }

  function predictNextTarget(history) {
    if (!history || history.length === 0) return null;
    const alpha = 0.18;
    let ema = history[0].crash;
    for (let i = 1; i < history.length; i++) {
      ema = alpha * history[i].crash + (1 - alpha) * ema;
    }
    const recent = history.slice(-15);
    const lowRate = recent.filter((h) => h.crash < 1.5).length / recent.length;
    const safetyFactor = 1 - Math.min(0.6, lowRate * 0.8);
    const predicted = Math.max(1.02, parseFloat((ema * safetyFactor).toFixed(2)));
    return predicted;
  }

  useEffect(() => {
    setPredictedTarget(predictNextTarget(history));
  }, [history]);

  function startFlight() {
    if (status === "flying") return;
    const rng = seededRandom(Math.floor(Math.random() * 1000000));
    const crashPoint = generateCrashPoint(rng);
    crashPointRef.current = crashPoint;
    setStatus("flying");
    setMultiplier(1.0);

    const start = performance.now();
    const speed = 0.06 + Math.random() * 0.01;

    function frame(now) {
      const t = now - start;
      const current = 1 + Math.exp(speed * t * 0.002) - 1;
      if (current >= crashPointRef.current) {
        if(!co) {
          setBalance(balance-betAmount)
        }
        setMultiplier(crashPointRef.current);
        setStatus("crashed");
        setHistory((h) => [
          ...h.slice(-99),
          { id: (h[h.length - 1]?.id || 0) + 1, crash: crashPointRef.current, time: Date.now() },
        ]);
        return; 
      }
      setMultiplier(parseFloat(current.toFixed(2)));

      if (autoCash && current >= autoCash && autoCO) {
        setBalance((b) => parseFloat((b + betAmount * autoCash).toFixed(2)));
        setStatus("cashed");
        setHistory((h) => [
          ...h.slice(-99),
          { id: (h[h.length - 1]?.id || 0) + 1, crash: crashPointRef.current, time: Date.now() },
        ]);
        return;
      }

      flightRef.current = requestAnimationFrame(frame);
    }

    flightRef.current = requestAnimationFrame(frame);
  }

  function cashOutNow() {
    if (status !== "flying") return;
    const current = multiplier;
    setCo(true)
    setBalance((b) => parseFloat((b + betAmount * current).toFixed(2)));
    setStatus("cashed");
    setHistory((h) => [
      ...h.slice(-99),
      { id: (h[h.length - 1]?.id || 0) + 1, crash: crashPointRef.current || current, time: Date.now() },
    ]);
    if (flightRef.current) cancelAnimationFrame(flightRef.current);
  }

  useEffect(() => {
    if (status === "crashed" || status === "cashed") {
      if (flightRef.current) cancelAnimationFrame(flightRef.current);
      const t = setTimeout(() => setStatus("ready"), 1400);
      setMultiplier(1.0);
      return () => clearTimeout(t);
    }
  }, [status]);

  function Sparkline({ data = [], color = "#4ade80" }) {
    if (!data.length) return null;
    const w = 150
    const h = 48
    const max = Math.max(...data)
    const min = Math.min(...data)
    const pts = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * w;
        const y = h - ((v - min) / (max - min || 1)) * h;
        return `${x},${y}`;
      })
      .join(" ");
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="rounded">
        <polyline points={pts} fill="none" stroke={color} strokeOpacity="0.5" strokeWidth={2} />
      </svg>
    );
  }

  function handleToggle() {
    if(!autoCO) {
      labelRef.current.classList.add("before:translate-x-[1.6em]")
      labelRef.current.classList.remove("before:bg-red-400")
      labelRef.current.classList.add("before:bg-emerald-500")
    }else {
      labelRef.current.classList.remove("before:translate-x-[1.6em]")
      labelRef.current.classList.remove("before:bg-emerald-500")
      labelRef.current.classList.add("before:bg-red-400")
    }
  }

  const lastMultipliers = history.slice(-20).map((h) => h.crash);

  return (
    <>
      <div className="relative min-h-screen bg-[url(https://hostinggambar.com/images/2025/08/10/bg-spaceman-1.webp)] bg-cover bg-center bg-no-repeat p-6 flex flex-col items-center">
        {/* <div className="bg-black/60 z-50 absolute top-0 left-0 h-screen w-screen">

        </div> */}
        <div className="max-w-2xl w-full">
          <header className="text-center">
            <div className="inline-block bg-violet-800/20 rounded-full px-3 py-1 text-sm text-white">▲ Spaceman</div>
            <img className="w-48 mx-auto mb-3 my-4" src="https://hostinggambar.com/images/2024/08/20/logo.gif" alt="xtoto" />
            <h1 className="text-3xl font-extrabold text-white mt-3">Spaceman Analyzer</h1>
            <p className="text-sm text-white/80 my-2">Analisis pola, prediksi, dan simulasi yang terintegrasi dengan pragmatic play.</p>
            <div className="inline-block shadow-lg mb-4 mt-2">
              <a href="https://shrtlink.vip/xtotoseo" className="text-white flex justify-center items-center gap-2 font-semibold bg-violet-800/20 px-8 py-2 rounded-lg backdrop-blur-md uppercase">
                coba sekarang
                <svg 
                xmlns="http://www.w3.org/2000/svg" 
                fill="none" viewBox="0 0 24 24" 
                strokeWidth={1.5} 
                stroke="currentColor" 
                className="size-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg> 
              </a>
            </div>
          </header>

          <section className="bg-violet-800/20 rounded-2xl p-6 shadow-lg backdrop-blur-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
              <div className="col-span-2 bg-white/4 p-4 rounded-md">
                <div className="bg-white/10 rounded-lg p-6 text-center">
                  <div className="text-5xl font-bold text-white">{multiplier.toFixed(2)}x</div>
                  <div className="mt-3 text-sm text-white/70">{status === 'flying' ? 'In flight' : status === 'crashed' ? 'Crashed' : status === 'cashed' ? 'Cashed out' : 'Ready'}</div>
                  <div className="mt-4 flex gap-2 justify-center">
                    {status !== 'flying' && (
                      <button onClick={startFlight} className="px-6 py-3 cursor-pointer bg-emerald-500 hover:bg-emerald-600 rounded-full font-semibold">
                        ▲ START FLIGHT
                      </button>
                    )}
                    {status === 'flying' && (
                      <button onClick={cashOutNow} className="px-6 py-3 cursor-pointer bg-orange-500 hover:bg-orange-600 rounded-full font-semibold text-white">
                        $ CASH OUT
                      </button>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 text-center text-white/80">
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-sm">Status</div>
                    <div className="font-bold text-lg">{status}</div>
                  </div>
                  <div className="bg-white/10 rounded p-3">
                    <div className="text-sm">Balance</div>
                    <div className="font-bold text-lg">${balance.toFixed(2)}</div>
                  </div>
                </div>
              </div>

              <aside className="p-4 bg-white/4 rounded-lg">
                <div className="mb-3 text-white/90 font-medium">Prediction</div>
                <div className="bg-white/10 rounded p-3 text-center">
                  <div className="text-sm text-white/70">Predicted Target</div>
                  <div className="text-2xl font-bold text-red-400 mt-1">{predictedTarget ? `${predictedTarget}x` : '—'}</div>
                  <div className="text-xs text-white/60 mt-2">Model: EMA + volatility adjustment</div>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-white/80 mb-2 flex gap-2">
                    <div className="toggle-switch relative flex w-10 cursor-pointer" onClick={handleToggle}>
                      <input className="hidden toggle-input" type="checkbox" id="toggle-auto-co" value={autoCO} onChange={(e) => setAutoCO(e.target.checked)}/>
                      <label ref={labelRef} htmlFor="toggle-auto-co" className="toggle-label before:bg-red-400"></label>
                    </div>
                    <p>Auto Cash-Out</p>
                  </div>
                  <div className="flex">
                    <button className="bg-white/10 cursor-pointer rounded-l-2xl px-3" onClick={() => setAutoCash((prev) => parseFloat((prev - 0.01).toFixed(2)))}><img className="w-7" src="https://hostinggambar.com/images/2025/08/09/arrow_back_ios_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="arrow" /></button>
                    <input
                      type="number"
                      min={1.02}
                      max={10}
                      step={0.01}
                      value={autoCash}
                      onChange={(e) => setAutoCash(parseFloat(e.target.value))}
                      className="border-x border-white/20 w-full p-2 bg-white/10 text-center text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [appearance:textfield] focus:outline-none"
                    />
                    <button className="bg-white/10 cursor-pointer rounded-r-2xl px-3" onClick={() => setAutoCash((prev) => parseFloat((prev + 0.01).toFixed(2)))}><img className="w-7" src="https://hostinggambar.com/images/2025/08/09/arrow_forward_ios_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="arrow" /></button>
                  </div>

                  <div className="mt-4 text-sm text-white/80">Bet Amount</div>
                  <div className="flex">
                    <button className="bg-white/10 cursor-pointer rounded-l-2xl px-3" onClick={() => setBetAmount((prev) => parseFloat((prev - 0.01).toFixed(2)))}><img className="w-7" src="https://hostinggambar.com/images/2025/08/09/arrow_back_ios_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="arrow" /></button>
                    <input type="number"  value={betAmount} onChange={(e) => setBetAmount(parseFloat(e.target.value) || 0)} className="border-x border-white/20 w-full text-center p-2 bg-white/10 text-white [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:m-0 [appearance:textfield] focus:outline-none" />
                    <button className="bg-white/10 cursor-pointer rounded-r-2xl px-3" onClick={() => setBetAmount((prev) => parseFloat((prev + 0.01).toFixed(2)))}><img className="w-7" src="https://hostinggambar.com/images/2025/08/09/arrow_forward_ios_24dp_E3E3E3_FILL0_wght400_GRAD0_opsz24.png" alt="arrow" /></button>
                  </div>
                </div>
              </aside>
            </div>

            <div className="mt-6 bg-white/4 rounded p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="text-xs text-white/90">Last {lastMultipliers.length} rounds</div>
                <div className="text-sm text-white/90 font-medium">Recent History</div>
              </div>
              <div className="flex gap-4 items-center">
                <Sparkline data={lastMultipliers} />
                <div className="flex-1">
                  <div className="grid md:grid-cols-4 grid-cols-3 gap-2">
                    {history.slice(-8).reverse().map((h) => (
                      <div key={h.id} className="bg-white/10 rounded p-2 text-center text-xs">
                        <div className="font-semibold text-white">{h.crash}x</div>
                        <div className="text-white/60">#{h.id}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 text-xs text-white/60">Note: This is a client-side simulation and prediction demo for educational purposes. Do not use for real gambling.</div>
          </section>
        </div>
      </div>
    </>
  )
}

export default App
