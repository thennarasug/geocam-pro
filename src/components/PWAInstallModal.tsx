import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { 
  X, 
  Download, 
  Smartphone, 
  CheckCircle2, 
  Camera, 
  Share, 
  Github, 
  Copy, 
  Check, 
  ExternalLink, 
  QrCode, 
  Archive,
  Terminal,
  Sparkles,
  Package,
  Layers,
  Wrench,
  HelpCircle
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'apk' | 'mobile' | 'github'>('apk');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState<boolean>(false);

  // Live URL for testing on mobile device
  const mobileUrl = 'https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app';
  const githubUser = 'thennarasug';
  const githubRepoName = 'geocam-pro';

  // PWABuilder URL for instant Cloud APK generation
  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(mobileUrl)}`;

  useEffect(() => {
    QRCode.toDataURL(mobileUrl, {
      width: 220,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.warn('QR code generation error:', err));
  }, [mobileUrl]);

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(mobileUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const gitCommands = `# Add GitHub remote for user ${githubUser}
git remote add origin https://github.com/${githubUser}/${githubRepoName}.git

# Ensure main branch
git branch -M main

# Push source code to GitHub
git push -u origin main`;

  const handleCopyGit = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(gitCommands);
      setCopiedGitCmd(true);
      setTimeout(() => setCopiedGitCmd(false), 2000);
    }
  };

  const handleDownloadSourceZip = () => {
    const a = document.createElement('a');
    a.href = '/geocam-pro-source.zip';
    a.download = `${githubRepoName}-source.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDownloadAndroidProject = () => {
    const a = document.createElement('a');
    a.href = '/geocam-pro-android-project.zip';
    a.download = `${githubRepoName}-android-project.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-4 text-slate-100 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-1.5 flex items-center justify-center shadow">
              <Camera className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>Download APK & Mobile Export</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-1.5 py-0.2 rounded font-mono">v1.0</span>
              </h2>
              <p className="text-[11px] text-slate-400">Target User: <span className="text-cyan-400 font-mono">@{githubUser}</span></p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-2 sm:px-4 shrink-0 overflow-x-auto">
          <button
            onClick={() => setActiveTab('apk')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'apk'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>📦 Download APK</span>
          </button>

          <button
            onClick={() => setActiveTab('mobile')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'mobile'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 Mobile Test / WebAPK</span>
          </button>

          <button
            onClick={() => setActiveTab('github')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-1.5 border-b-2 whitespace-nowrap transition ${
              activeTab === 'github'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>🐙 GitHub Export</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: DOWNLOAD APK (PRIMARY) */}
          {activeTab === 'apk' && (
            <div className="space-y-3.5">
              {/* Option 1: PWABuilder 1-Click APK Generator */}
              <div className="bg-gradient-to-br from-cyan-950/50 via-slate-900 to-slate-950 p-4 rounded-2xl border border-cyan-500/50 shadow-lg space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs">Method 1: Instant Cloud APK Generator</h3>
                      <p className="text-[10px] text-cyan-300/80 font-mono">PWABuilder (Google & Microsoft Partner)</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-bold">
                    Fastest (No setup)
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Generates a signed Android <strong className="text-white">.apk</strong> and Google Play <strong className="text-white">.aab</strong> package directly from our verified PWA manifest in ~15 seconds.
                </p>
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-xl flex items-center justify-center gap-2 shadow transition transform active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Generate & Download APK on PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>

              {/* Option 2: Turnkey Android Studio / Gradle Build Kit */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center">
                      <Wrench className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-xs">Method 2: Android Studio & Gradle Project</h3>
                      <p className="text-[10px] text-slate-400 font-mono">Turnkey build kit with AndroidManifest</p>
                    </div>
                  </div>
                  <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                    ZIP Kit
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Download the ready-to-build Android Studio project bundle. Contains camera permissions, geolocation hardware hooks, Gradle build files, and 1-click build guide.
                </p>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={handleDownloadAndroidProject}
                    className="flex-1 py-2 px-3 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl border border-slate-700 flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4 text-cyan-400" />
                    <span>Download Android Project (ZIP)</span>
                  </button>
                </div>
                <div className="bg-black/80 rounded-xl p-2.5 font-mono text-[10px] text-slate-300 border border-slate-800">
                  <span className="text-slate-500"># Run in terminal to build APK:</span>
                  <div className="text-emerald-300 mt-0.5">./gradlew assembleDebug</div>
                  <div className="text-slate-400 text-[9px] mt-0.5">Output: app/build/outputs/apk/debug/app-debug.apk</div>
                </div>
              </div>

              {/* Option 3: Native WebAPK Minting on Android Phone */}
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-slate-800 text-cyan-400 flex items-center justify-center">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-xs">Method 3: Native Android WebAPK (Direct on Device)</h3>
                    <p className="text-[10px] text-slate-400 font-mono">Android OS built-in APK compiler</p>
                  </div>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  When opened in Google Chrome or Samsung Internet on Android, Android's Google Play Services automatically compiles and installs an actual <strong className="text-white">WebAPK</strong> into your phone's app drawer.
                </p>

                {isInstallable ? (
                  <button
                    onClick={install}
                    className="w-full py-2.5 px-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl shadow flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install WebAPK Directly to this Device</span>
                  </button>
                ) : (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-900 border border-slate-800">
                    <span className="text-[11px] text-slate-400">Open on your Android phone to install:</span>
                    <button
                      onClick={() => setActiveTab('mobile')}
                      className="text-cyan-400 hover:underline font-bold text-xs"
                    >
                      Show Mobile QR Code →
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: MOBILE QR CODE & TEST */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2 rounded-xl shadow shrink-0">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Scan QR Code" className="w-36 h-36 rounded-lg block" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-500 font-mono">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0 space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-cyan-400 font-bold text-xs uppercase tracking-wider">
                    <QrCode className="w-4 h-4" /> Scan with Mobile Phone Camera
                  </div>
                  <p className="text-slate-300 leading-relaxed text-[11px]">
                    Point your Android or iPhone camera at this QR code to open the app directly on your phone and test all camera, compass, and offline GPS features.
                  </p>
                  <button
                    onClick={handleCopyLink}
                    className="w-full sm:w-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Mobile Link'}</span>
                  </button>
                </div>
              </div>

              {isInstallable && (
                <button
                  onClick={install}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition transform active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Install WebAPK on this Device Now</span>
                </button>
              )}

              <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 space-y-2.5">
                <div className="font-bold text-cyan-300 flex items-center gap-2 text-xs">
                  <Smartphone className="w-4 h-4" />
                  How to Install as APK on Android:
                </div>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-300 text-[11px] leading-relaxed">
                  <li>Scan the QR code above or open the link in <strong>Google Chrome</strong> or <strong>Samsung Internet</strong> on Android.</li>
                  <li>Tap the <strong>"Install App"</strong> banner or tap the browser menu (<strong>3 dots ⋮</strong> in top right).</li>
                  <li>Select <strong>"Install App"</strong> or <strong>"Add to Home screen"</strong>.</li>
                  <li>Android automatically compiles and installs the app as a native <strong>WebAPK</strong> with its own icon in your phone's app drawer!</li>
                  <li>Open the APK — enjoy true full-screen viewfinder, offline satellite GPS tracking, and instant camera shutter.</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 3: GITHUB EXPORT */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-cyan-950/40 to-slate-950 p-4 rounded-2xl border border-cyan-500/40 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-xs flex items-center gap-2">
                    <Archive className="w-4 h-4 text-cyan-400" />
                    Download Full Source Code (ZIP)
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Includes all TypeScript code, camera engines, PWA manifest, service workers, and icons.
                  </p>
                </div>
                <button
                  onClick={handleDownloadSourceZip}
                  className="w-full sm:w-auto px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ZIP</span>
                </button>
              </div>

              <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 flex items-center gap-1.5 text-xs">
                    <Terminal className="w-4 h-4 text-cyan-400" />
                    Push to GitHub Repository (@{githubUser})
                  </span>
                  <button
                    onClick={handleCopyGit}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold transition border border-slate-700"
                  >
                    {copiedGitCmd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedGitCmd ? 'Commands Copied!' : 'Copy Commands'}</span>
                  </button>
                </div>

                <div className="bg-black/80 rounded-xl p-3 font-mono text-[11px] text-emerald-300 border border-slate-800 overflow-x-auto space-y-1">
                  <div>git remote add origin https://github.com/{githubUser}/{githubRepoName}.git</div>
                  <div>git branch -M main</div>
                  <div>git push -u origin main</div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1.5 pt-1">
                  <p><strong>Step 1:</strong> Go to <a href="https://github.com/new" target="_blank" rel="noreferrer" className="text-cyan-400 underline">github.com/new</a> and create a repository named <code className="text-slate-200 bg-slate-900 px-1 py-0.5 rounded">{githubRepoName}</code> under your account <strong className="text-slate-200">{githubUser}</strong>.</p>
                  <p><strong>Step 2:</strong> Download the ZIP or run the commands above in your terminal.</p>
                  <p><strong>Alternative:</strong> You can also drag-and-drop the downloaded source code files directly onto the GitHub repository web page!</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-500 font-mono">GeoCam Pro v1.0.0</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-medium transition text-xs"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
