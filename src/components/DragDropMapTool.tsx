import React, { useState, useRef } from 'react';
import { Station, CargasFacilityType } from '../types';
import { CARGAS_FACILITY_META } from '../utils/companyAssets';
import { CARGAS_LOGO_SVG } from '../utils/cargasLogo';
import { compressLogoImage, saveStoredCustomLogo } from '../utils/imageCompressor';
import { 
  Move, 
  Upload, 
  MapPin, 
  Check, 
  X, 
  Sparkles, 
  Image as ImageIcon,
  Fuel,
  Wrench,
  Droplet,
  SearchCheck,
  AlertCircle,
  HelpCircle,
  CheckCircle2,
  CheckSquare,
  Layers,
  Stamp
} from 'lucide-react';

interface DragDropMapToolProps {
  stations: Station[];
  onSaveStations?: (stations: Station[]) => void;
  isAdminEditMode: boolean;
  onToggleAdminEditMode: () => void;
  uploadedLogoUrl: string;
  onLogoUpload: (logoUrl: string) => void;
  onApplyLogoToAllStations: (logoUrl: string) => void;
  onStationDropToCreate: (newStationData: {
    lat: number;
    lng: number;
    facilityType: CargasFacilityType;
    name: string;
    customLogoUrl?: string;
    cng?: boolean;
    conversionCenter?: boolean;
    oilCenter?: boolean;
    cylinderInspection?: boolean;
  }) => void;
  onClose?: () => void;
}

export const DragDropMapTool: React.FC<DragDropMapToolProps> = ({
  stations,
  isAdminEditMode,
  onToggleAdminEditMode,
  uploadedLogoUrl,
  onLogoUpload,
  onApplyLogoToAllStations,
  onStationDropToCreate,
  onClose
}) => {
  const [selectedFacilityType, setSelectedFacilityType] = useState<CargasFacilityType>('station');
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const [stationNamePrefix, setStationNamePrefix] = useState<string>('');
  
  // Facilities present at this single station (supporting all 4 together)
  const [hasCng, setHasCng] = useState<boolean>(true);
  const [hasConversion, setHasConversion] = useState<boolean>(true);
  const [hasOil, setHasOil] = useState<boolean>(true);
  const [hasCylinder, setHasCylinder] = useState<boolean>(true);

  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressLogoImage(file, 200, 0.88);
      saveStoredCustomLogo(compressed);
      onLogoUpload(compressed);
      onApplyLogoToAllStations(compressed);
      setAppliedSuccess(true);
      setTimeout(() => setAppliedSuccess(false), 3500);
    } catch (err) {
      console.warn('Logo processing error:', err);
      const reader = new FileReader();
      reader.onload = (event) => {
        const result = event.target?.result as string;
        if (result) {
          saveStoredCustomLogo(result);
          onLogoUpload(result);
          onApplyLogoToAllStations(result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleApplyToAll = () => {
    if (!uploadedLogoUrl) return;
    saveStoredCustomLogo(uploadedLogoUrl);
    onApplyLogoToAllStations(uploadedLogoUrl);
    setAppliedSuccess(true);
    setTimeout(() => setAppliedSuccess(false), 3000);
  };

  const setAllFacilities = (value: boolean) => {
    setHasCng(value);
    setHasConversion(value);
    setHasOil(value);
    setHasCylinder(value);
  };

  // Handle Drag Start from Tool Palette
  const handleDragStart = (e: React.DragEvent) => {
    const payload = {
      facilityType: selectedFacilityType,
      customLogoUrl: uploadedLogoUrl || '',
      name: stationNamePrefix.trim() || 'محطة كارجاس متكاملة',
      cng: hasCng,
      conversionCenter: hasConversion,
      oilCenter: hasOil,
      cylinderInspection: hasCylinder
    };
    e.dataTransfer.setData('text/plain', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  return (
    <div className="fixed top-24 left-4 z-[700] max-w-xs md:max-w-sm w-full font-['Cairo'] transition-all">
      <div className="bg-slate-900/95 text-white border-2 border-emerald-500/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden">
        {/* Header Bar */}
        <div className="px-3.5 py-2.5 bg-gradient-to-r from-emerald-900/90 via-slate-900 to-slate-900 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-black text-emerald-300">أداة السحب والإفلات وتخصيص اللوجو</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              title="كيفية الاستخدام"
            >
              <HelpCircle className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
            >
              {isExpanded ? 'طي الأداة' : 'فتح'}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 cursor-pointer"
                title="إغلاق"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Instructions Banner if opened */}
        {showHelp && (
          <div className="p-3 bg-emerald-950/60 border-b border-emerald-800/80 text-[11px] text-emerald-200 leading-relaxed space-y-1">
            <div className="font-black text-emerald-100 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              الميزات المتاحة لمدير النظام:
            </div>
            <p>1. <strong>لوجو واحد مدمج:</strong> المحطة الواحدة يمكن أن تضم (غاز + تحويل وصيانة + زيوت + فحص أسطوانات) بشعار كارجاس الموحد مع علامات الخدمات تحته.</p>
            <p>2. <strong>توقيع اللوجو على كافة المحطات:</strong> ارفع اللوجو واضغط «تطبيق على كافة المحطات» ليتحول الشعار فورياً على الخريطة بأكملها.</p>
            <p>3. <strong>السحب والإفلات:</strong> اسحب المجسم وأفلته في أي موقع على الخريطة لإنشاء المحطة وحفظها في ثانية واحدة.</p>
          </div>
        )}

        {isExpanded && (
          <div className="p-3 space-y-3 max-h-[75vh] overflow-y-auto no-scrollbar">
            {/* Mode 1: Drag existing markers on map toggle */}
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700/80 flex items-center justify-between">
              <div className="space-y-0.5 pr-1">
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <Move className="w-3.5 h-3.5 text-amber-400" />
                  <span>تحريك المحطات القائمة بالسحب</span>
                </div>
                <div className="text-[10px] text-slate-400">
                  {isAdminEditMode ? 'الدبابيس قابلة للسحب والإسقاط الآن' : 'اضغط للتفعيل وتحريك الدبابيس على الخريطة'}
                </div>
              </div>

              <button
                onClick={onToggleAdminEditMode}
                className={`px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer transition active:scale-95 flex items-center gap-1 ${
                  isAdminEditMode
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-md ring-2 ring-amber-300 animate-pulse'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                {isAdminEditMode ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>مُفعّل</span>
                  </>
                ) : (
                  <span>تفعيل</span>
                )}
              </button>
            </div>

            {/* Logo Upload & Global Stamp Section */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-400" />
                  شعار المنظومة / اللوجو المرفوع:
                </span>

                {uploadedLogoUrl && (
                  <button
                    onClick={() => {
                      onLogoUpload('');
                      onApplyLogoToAllStations('');
                    }}
                    className="text-[10px] text-rose-400 hover:underline cursor-pointer"
                  >
                    استعادة الشعار الرسمي
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                {/* Logo Preview */}
                <div className="w-12 h-12 rounded-full bg-white p-1 border-2 border-emerald-500 shadow-md shrink-0 flex items-center justify-center overflow-hidden">
                  {uploadedLogoUrl ? (
                    <img 
                      src={uploadedLogoUrl} 
                      alt="Uploaded Logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                  )}
                </div>

                <div className="flex-1 space-y-1.5">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-1.5 px-2 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/60 text-emerald-300 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer transition active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>رفع لوجو من جهازك (PNG/JPG)</span>
                  </button>
                </div>
              </div>

              {/* Apply Logo to All Stations Button */}
              {uploadedLogoUrl && (
                <div className="pt-1 border-t border-slate-700/60">
                  <button
                    type="button"
                    onClick={handleApplyToAll}
                    className={`w-full py-2 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-2 cursor-pointer shadow-lg transition active:scale-95 ${
                      appliedSuccess
                        ? 'bg-emerald-600 text-white'
                        : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                    }`}
                  >
                    {appliedSuccess ? (
                      <>
                        <Check className="w-4 h-4 text-white" />
                        <span>تم توقيع وتطبيق اللوجو على كافة المحطات ({stations.length}) بنجاح!</span>
                      </>
                    ) : (
                      <>
                        <Stamp className="w-4 h-4" />
                        <span>✍️ توقيع هذا اللوجو على كافة المحطات بالخريطة ({stations.length})</span>
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-emerald-300/80 text-center mt-1">
                    بضغطة واحدة يتحول هذا اللوجو ويوقع على كافة المحطات بالخريطة فورياً
                  </p>
                </div>
              )}
            </div>

            {/* Composite Station Facility Checkboxes (Multiple Services in One Station) */}
            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-slate-700/70 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-black text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  خدمات المحطة الواحدة (لوجو مدمج):
                </label>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => setAllFacilities(true)}
                    className="text-[10px] px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-700 font-bold hover:bg-emerald-900 cursor-pointer"
                  >
                    الكل (شاملة)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCng}
                    onChange={(e) => setHasCng(e.target.checked)}
                    className="accent-emerald-500 rounded"
                  />
                  <span className="text-emerald-400 font-bold">⛽ تموين غاز</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasConversion}
                    onChange={(e) => setHasConversion(e.target.checked)}
                    className="accent-amber-500 rounded"
                  />
                  <span className="text-amber-400 font-bold">🛠️ تحويل وصيانة</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasOil}
                    onChange={(e) => setHasOil(e.target.checked)}
                    className="accent-blue-500 rounded"
                  />
                  <span className="text-blue-400 font-bold">🛢️ زيوت معتمدة</span>
                </label>

                <label className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-900/80 border border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasCylinder}
                    onChange={(e) => setHasCylinder(e.target.checked)}
                    className="accent-purple-500 rounded"
                  />
                  <span className="text-purple-400 font-bold">🔍 فحص أسطوانات</span>
                </label>
              </div>
            </div>

            {/* Station Name Input before drag */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-300 block">
                اسم المحطة المراد إضافتها:
              </label>
              <input
                type="text"
                value={stationNamePrefix}
                onChange={(e) => setStationNamePrefix(e.target.value)}
                placeholder="محطة كارجاس متكاملة"
                className="w-full px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-bold"
              />
            </div>

            {/* The Draggable Composite Emblem Card */}
            <div className="p-3 bg-gradient-to-br from-emerald-950/60 to-slate-900 border-2 border-dashed border-emerald-500/80 rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
              <div className="text-[11px] font-black text-emerald-300">
                👇 اسحب هذا الشعار وأفلته على الخريطة
              </div>

              {/* Draggable Composite Token */}
              <div
                draggable
                onDragStart={handleDragStart}
                className="group relative cursor-grab active:cursor-grabbing p-2.5 rounded-2xl bg-slate-900 border-2 border-emerald-400 shadow-2xl flex flex-col items-center gap-1.5 transition-transform hover:scale-110 active:scale-95"
              >
                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-black">
                  <span>{stationNamePrefix.trim() || 'كارجاس متكاملة'}</span>
                </div>

                {/* Circular Main Logo */}
                <div className="w-12 h-12 rounded-full bg-white p-1 border-2 border-emerald-600 shadow-lg flex items-center justify-center overflow-hidden">
                  {uploadedLogoUrl ? (
                    <img 
                      src={uploadedLogoUrl} 
                      alt="logo" 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <div dangerouslySetInnerHTML={{ __html: CARGAS_LOGO_SVG }} className="w-full h-full" />
                  )}
                </div>

                {/* Mini Badges underneath the Logo */}
                <div className="flex items-center gap-1 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                  {hasCng && <span className="text-[9px] text-emerald-400 font-bold">⛽ غاز</span>}
                  {hasConversion && <span className="text-[9px] text-amber-400 font-bold">🛠️ تحويل</span>}
                  {hasOil && <span className="text-[9px] text-blue-400 font-bold">🛢️ زيوت</span>}
                  {hasCylinder && <span className="text-[9px] text-purple-400 font-bold">🔍 فحص</span>}
                </div>

                <div className="text-[9px] font-black text-emerald-400 flex items-center gap-1">
                  <Move className="w-2.5 h-2.5" />
                  <span>اسحبني للخريطة وتثبيت موقعي فوراً</span>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 leading-tight">
                أفلت في أي موقع على الخريطة لتثبيت المحطة بالخدمات المختارة والشعار المرفوع
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
