import React, { useState, useRef } from 'react';
import { Station } from '../types';
import { parseKMZ, parseKML, parseCSV, parseGeoJSON } from '../services/kmlParser';
import { speechService } from '../services/speechService';
import { 
  Upload, 
  FileCode, 
  FileArchive, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  MapPin, 
  Plus, 
  RefreshCw, 
  Layers,
  Sparkles,
  Fuel
} from 'lucide-react';

interface KmzUploaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportStations: (imported: Station[], mode: 'append' | 'replace') => void;
  currentStationsCount: number;
  globalStationLogoUrl?: string;
}

export const KmzUploaderModal: React.FC<KmzUploaderModalProps> = ({
  isOpen,
  onClose,
  onImportStations,
  currentStationsCount,
  globalStationLogoUrl,
}) => {
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [parsedStations, setParsedStations] = useState<Station[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [fileSize, setFileSize] = useState<string>('');
  const [importMode, setImportMode] = useState<'append' | 'replace'>('append');
  const [assignAsCargas, setAssignAsCargas] = useState<boolean>(true);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!isOpen) return null;

  const handleProcessFile = async (file: File) => {
    setIsLoading(true);
    setErrorMessage(null);
    setFileName(file.name);
    setFileSize((file.size / 1024).toFixed(1) + ' KB');

    try {
      const lower = file.name.toLowerCase();
      let extracted: Station[] = [];

      if (lower.endsWith('.kmz')) {
        const buffer = await file.arrayBuffer();
        extracted = await parseKMZ(buffer);
      } else if (lower.endsWith('.kml')) {
        const text = await file.text();
        extracted = parseKML(text);
      } else if (lower.endsWith('.csv') || lower.endsWith('.txt')) {
        const text = await file.text();
        extracted = parseCSV(text);
      } else if (lower.endsWith('.json') || lower.endsWith('.geojson')) {
        const text = await file.text();
        extracted = parseGeoJSON(text);
      } else {
        throw new Error('نوع الملف غير مدعوم. يرجى اختيار ملف KMZ أو KML أو CSV.');
      }

      if (extracted.length === 0) {
        throw new Error('لم يتم العثور على أي مواقع أو محطات صالحة داخل الملف. تأكد من أن الملف يحتوي على Placemarks وإحداثيات صحيحة.');
      }

      setParsedStations(extracted);
      speechService.playChime('turn');
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || 'حدث خطأ أثناء معالجة وقراءة الملف.');
      setParsedStations([]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleConfirmImport = () => {
    if (parsedStations.length === 0) return;

    // Apply Cargas branding and defaults if selected
    const finalized = parsedStations.map((st) => {
      let company = assignAsCargas ? 'كار جاس' : st.company || 'كار جاس';
      let logo = st.customLogoUrl || (assignAsCargas ? globalStationLogoUrl : undefined);
      return {
        ...st,
        company,
        customLogoUrl: logo,
        cng: true,
        verified: true,
        updatedAt: new Date().toISOString()
      };
    });

    onImportStations(finalized, importMode);
    speechService.playChime('arrive');
    speechService.speak(`تم استيراد ${finalized.length} محطة بنجاح وإضافتها لخريطة ونظام ملاحة كار جاس.`, { priority: true });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 md:p-6 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="relative w-full max-w-2xl bg-slate-900 border-2 border-emerald-500/50 rounded-3xl shadow-2xl p-5 md:p-6 text-white max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600/30 border border-emerald-500/50 flex items-center justify-center text-emerald-400">
              <FileArchive className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base md:text-lg font-black text-white flex items-center gap-2">
                <span>رفع واستيراد ملفات KMZ / KML</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full font-bold">
                  Google Earth المعتمدة
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                أضف محطات ومواقع إضافية لخريطة كار جاس عبر ملفات Google Earth وKMZ
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto py-4 flex flex-col gap-4">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-3 ${
              isDragging
                ? 'border-emerald-400 bg-emerald-950/40 scale-[1.01]'
                : 'border-slate-700 hover:border-emerald-500 bg-slate-800/40 hover:bg-slate-800/70'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".kmz,.kml,.csv,.geojson,.json"
              onChange={handleFileInputChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Upload className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="text-sm font-black text-slate-200">
                اسحب وأفلت ملف KMZ أو KML هنا، أو انقر للاختيار من جهازك
              </div>
              <div className="text-xs text-slate-400 mt-1">
                يدعم ملفات Google Earth (.kmz مع الشعارات)، وملفات KML، وCSV
              </div>
            </div>
          </div>

          {/* Loading Indicator */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-center justify-center gap-3 text-emerald-300 font-bold text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>جارِ فك ضغط واستخراج المحطات والإحداثيات من ملف {fileName}...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-500/50 flex items-center gap-2 text-rose-300 text-xs font-bold">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Parsed Preview Section */}
          {parsedStations.length > 0 && !isLoading && (
            <div className="flex flex-col gap-3">
              <div className="p-3.5 rounded-2xl bg-emerald-950/50 border border-emerald-500/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                  <div>
                    <div className="text-xs font-black text-emerald-300">
                      تم استخراج {parsedStations.length} موقع / محطة بنجاح من {fileName} ({fileSize})
                    </div>
                    <div className="text-[11px] text-slate-300">
                      جاهزة للإضافة الفورية إلى نظام الملاحة وخريطة المحطات
                    </div>
                  </div>
                </div>
                <span className="px-3 py-1 bg-emerald-600 text-white rounded-xl text-xs font-black">
                  {parsedStations.length} محطة
                </span>
              </div>

              {/* Import Configuration Options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Append vs Replace */}
                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 flex flex-col gap-2">
                  <span className="font-bold text-slate-300">طريقة الإضافة للخريطة:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setImportMode('append')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-black text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        importMode === 'append'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>إضافة للمحطات ({currentStationsCount})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`flex-1 py-1.5 px-2 rounded-xl font-black text-[11px] transition cursor-pointer flex items-center justify-center gap-1 ${
                        importMode === 'replace'
                          ? 'bg-amber-600 text-white shadow'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>استبدال الكل</span>
                    </button>
                  </div>
                </div>

                {/* Company & Branding */}
                <div className="bg-slate-800/80 p-3 rounded-2xl border border-slate-700 flex flex-col justify-center">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignAsCargas}
                      onChange={(e) => setAssignAsCargas(e.target.checked)}
                      className="w-4 h-4 accent-emerald-500 rounded"
                    />
                    <span className="font-bold text-slate-200 text-xs">
                      اعتماد المحطات كـ محطات «كار جاس» مع تفعيل خدمات الغاز
                    </span>
                  </label>
                </div>
              </div>

              {/* Preview Stations List (scrollable) */}
              <div className="bg-slate-950/60 rounded-2xl border border-slate-800 p-2.5 max-h-48 overflow-y-auto flex flex-col gap-1.5">
                <div className="text-[11px] font-bold text-slate-400 px-1">
                  معاينة المواقع المستوردة (أول 20 محطة):
                </div>
                {parsedStations.slice(0, 20).map((st, i) => (
                  <div
                    key={st.id || i}
                    className="p-2 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="font-bold text-white truncate">{st.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                      {st.lat.toFixed(4)}, {st.lng.toFixed(4)}
                    </span>
                  </div>
                ))}
                {parsedStations.length > 20 && (
                  <div className="text-center text-[11px] text-slate-400 pt-1 font-bold">
                    + {parsedStations.length - 20} محطة أخرى جاهزة للاستيراد
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            إلغاء
          </button>
          <button
            onClick={handleConfirmImport}
            disabled={parsedStations.length === 0 || isLoading}
            className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 text-white rounded-xl text-xs font-black shadow-lg flex items-center gap-2 transition cursor-pointer active:scale-95"
          >
            <Sparkles className="w-4 h-4" />
            <span>تأكيد استيراد المحطات ({parsedStations.length})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
