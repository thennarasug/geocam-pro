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
  Sparkles
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ onClose }) => {
  const { isInstallable, isInstalled, install } = usePWAInstall();
  const [activeTab, setActiveTab] = useState<'mobile' | 'github'>('mobile');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedGitCmd, setCopiedGitCmd] = useState<boolean>(false);

  // Live URL for testing on mobile device
  const mobileUrl = 'https://ais-pre-nt57j32b64fgcv5cyo5zq4-315195682739.asia-southeast1.run.app';
  const githubUser = 'thennarasug';
  const githubRepoName = 'geocam-pro';

  useEffect(() => {
    QRCode.toDataURL(mobileUrl, {
      width: 200,
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

  const handleDownloadZip = () => {
    const a = document.createElement('a');
    a.href = '/geocam-pro-source.zip';
    a.download = `${githubRepoName}-source.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-3 sm:p-4 text-slate-100 animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl relative">
        {/* Top Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-emerald-500 p-1.5 flex items-center justify-center shadow">
              <Camera className="w-5 h-5 text-slate-950" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Mobile APK Test & GitHub Export</h2>
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
        <div className="flex border-b border-slate-800 bg-slate-950/50 px-4 shrink-0">
          <button
            onClick={() => setActiveTab('mobile')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'mobile'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>📱 Mobile APK Test</span>
          </button>
          <button
            onClick={() => setActiveTab('github')}
            className={`py-2.5 px-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition ${
              activeTab === 'github'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>🐙 GitHub Export (@{githubUser})</span>
          </button>
        </div>

        {/* Tab Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
          {/* TAB 1: MOBILE APK TEST */}
          {activeTab === 'mobile' && (
            <div className="space-y-4">
              {/* QR Code Card */}
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
                    Point your Android or iPhone camera at this QR code to open the app directly on your phone and test all camera/GPS hardware features.
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

              {/* Install Now Button if in standalone or installable */}
              {isInstallable && (
                <button
                  onClick={install}
                  className="w-full py-3 bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 text-sm transition transform active:scale-98"
                >
                  <Download className="w-4 h-4" />
                  <span>Install APK to this Device Now</span>
                </button>
              )}

              {/* Android WebAPK Instructions */}
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

          {/* TAB 2: GITHUB EXPORT */}
          {activeTab === 'github' && (
            <div className="space-y-4">
              {/* 1-Click ZIP Download Card */}
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
                  onClick={handleDownloadZip}
                  className="w-full sm:w-auto px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg transition shrink-0"
                >
                  <Download className="w-4 h-4" />
                  <span>Download ZIP</span>
                </button>
              </div>

              {/* Git Commands Box */}
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

                {/* Step-by-step guidance */}
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
