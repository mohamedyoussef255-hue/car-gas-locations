import React, { useState } from 'react';
import { Station, AppConfig, CompanyName, CongestionLevel } from '../types';
import { parseKML, parseCSV, parseGeoJSON, exportStationsToKML, exportStationsToCSV } from '../services/kmlParser';
import { 
  Lock, 
  Settings, 
  Plus, 
  Trash2, 
  Edit3, 
  Upload, 
  Download, 
  Bot, 
  Palette, 
  ShieldCheck, 
  FileCode, 
  Check, 
  X, 
  Eye, 
  EyeOff, 
  Search,
  Sparkles,
  MapPin,
  Save,
  Fuel
} from 'lucide-react';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  onSaveStations: (stations: Station[]) => void;
  config: AppConfig;
  onSaveConfig: (config: AppConfig) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  stations,
  onSaveStations,
  config,
  onSaveConfig,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [inputPassword, setInputPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');

  const [activeTab, setActiveTab] = useState<'stations' | 'import' | 'ai-discovery' | 'moein' | 'settings'>('stations');

  // Station edit/create state
  const [editingStation, setEditingStation] = useState<Station | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);
  const [stationForm, setStationForm] = useState<Partial<Station>>({
    name: '',
    company: 'كارجاس',
    address: '',
    lat: 30.0638,
    lng: 31.3325,
    cng: true,
    petrol: true,
    cngNozzles: 8,
    congestionLevel: 'low',
    waitTimeMinutes: 4,
    verified: true,
    workingHours: '24 ساعة',
    conversionCenter: false,
    cylinderInspection: true,
    services: ['غاز طبيعي مضغوط'],
    notes: ''
  });

  // Import state
  const [pastedData, setPastedData] = useState<string>('');
  const [importType, setImportType] = useState<'kml' | 'csv' | 'geojson'>('kml');
  const [importPreview, setImportPreview] = useState<Station[]>([]);
  const [importMessage, setImportMessage] = useState<string>('');

  // AI Discovery state
  const [aiSearchQuery, setAiSearchQuery] = useState<string>('القاهرة ومدينة نصر والتجمع ومصر الجديدة');
  const [isAiSearching, setIsAiSearching] = useState<boolean>(false);
  const [aiFoundStations, setAiFoundStations] = useState<Station[]>([]);

  // Config local form
  const [localConfig, setLocalConfig] = useState<AppConfig>({ ...config });
  const [newPasswordInput, setNewPasswordInput] = useState<string>('');
  const [configSuccess, setConfigSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  // Handle Login
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputPassword === config.adminPassword) {
      setIsAuthenticated(true);
      setAuthError('');
    } else {
      setAuthError('كلمة السر غير صحيحة! كلمة السر الافتراضية هي 0000');
    }
  };

  // Form Error & Feedback State
  const [formError, setFormError] = useState<string>('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form Handlers
  const handleOpenAdd = () => {
    setFormError('');
    setEditingStation(null);
    setStationForm({
      name: '',
      company: 'كارجاس',
      address: '',
      lat: 30.0638,
      lng: 31.3325,
      cng: true,
      petrol: true,
      cngNozzles: 8,
      congestionLevel: 'low',
      waitTimeMinutes: 4,
      verified: true,
      workingHours: '24 ساعة',
      conversionCenter: false,
      cylinderInspection: true,
      services: ['غاز طبيعي مضغوط'],
      notes: ''
    });
    setIsAddingNew(true);
  };

  const handleOpenEdit = (station: Station) => {
    setEditingStation(station);
    setStationForm({ ...station });
    setIsAddingNew(true);
  };

  const handleSaveStation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stationForm.name || !stationForm.lat || !stationForm.lng) {
      setFormError('برجاء كتابة اسم المحطة والإحداثيات (خط العرض والطول) بشكل صحيح!');
      return;
    }
    setFormError('');

    if (editingStation) {
      const updated = stations.map(s => s.id === editingStation.id ? { ...s, ...stationForm } as Station : s);
      onSaveStations(updated);
    } else {
      const newStation: Station = {
        ...stationForm,
        id: `custom-${Date.now()}`,
        name: stationForm.name || 'محطة غاز جديدة',
        company: stationForm.company || 'كارجاس',
        address: stationForm.address || 'عنوان المحطة',
        lat: Number(stationForm.lat),
        lng: Number(stationForm.lng),
        cng: stationForm.cng ?? true,
        petrol: stationForm.petrol ?? false,
        cngNozzles: Number(stationForm.cngNozzles || 8),
        congestionLevel: stationForm.congestionLevel || 'low',
        waitTimeMinutes: Number(stationForm.waitTimeMinutes || 4),
        verified: stationForm.verified ?? true,
        workingHours: stationForm.workingHours || '24 ساعة',
        conversionCenter: !!stationForm.conversionCenter,
        cylinderInspection: !!stationForm.cylinderInspection,
        services: stationForm.services || ['غاز طبيعي مضغوط'],
        updatedAt: new Date().toISOString().substring(0, 16)
      };
      onSaveStations([newStation, ...stations]);
    }
    setIsAddingNew(false);
    setEditingStation(null);
  };

  const confirmDeleteStation = (id: string) => {
    const filtered = stations.filter(s => s.id !== id);
    onSaveStations(filtered);
    setDeletingId(null);
  };

  // Import Handlers
  const handleParseImport = () => {
    if (!pastedData.trim()) {
      setImportMessage('برجاء لصق محتوى الملف أو تحميله أولاً!');
      return;
    }
    let parsed: Station[] = [];
    if (importType === 'kml') parsed = parseKML(pastedData);
    else if (importType === 'csv') parsed = parseCSV(pastedData);
    else parsed = parseGeoJSON(pastedData);

    if (parsed.length === 0) {
      setImportMessage('لم يتم العثور على أي محطات صالحة في البيانات المدخلة، تأكد من الصيغة.');
    } else {
      setImportPreview(parsed);
      setImportMessage(`تم تحليل ${parsed.length} محطة بنجاح من بيانات Google Earth! راجع المعاينة واضغط "تأكيد وإضافة للخريطة".`);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setPastedData(text);
      if (file.name.endsWith('.csv')) setImportType('csv');
      else if (file.name.endsWith('.json') || file.name.endsWith('.geojson')) setImportType('geojson');
      else setImportType('kml');
    };
    reader.readAsText(file);
  };

  const handleApplyImport = () => {
    if (importPreview.length === 0) return;
    onSaveStations([...importPreview, ...stations]);
    setImportMessage(`تمت إضافة ${importPreview.length} محطة بنجاح إلى الخريطة!`);
    setImportPreview([]);
    setPastedData('');
  };

  // AI Discovery
  const handleDiscoverStations = async () => {
    setIsAiSearching(true);
    try {
      const res = await fetch('/api/discover-stations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: aiSearchQuery })
      });
      const data = await res.json();
      if (data.suggestions && data.suggestions.length > 0) {
        const mapped: Station[] = data.suggestions.map((s: any, idx: number) => ({
          id: `ai-discovered-${Date.now()}-${idx}`,
          name: s.name,
          company: s.company || 'كارجاس',
          address: s.address,
          lat: s.lat,
          lng: s.lng,
          cng: s.cng ?? true,
          petrol: s.petrol ?? false,
          cngNozzles: s.nozzles || 8,
          congestionLevel: s.congestion || 'low',
          waitTimeMinutes: s.waitTimeMin || 4,
          verified: true,
          workingHours: '24 ساعة',
          conversionCenter: false,
          cylinderInspection: true,
          services: ['غاز طبيعي مضغوط تم تدقيقه بالذكاء الاصطناعي'],
          notes: s.notes || 'تم تدقيقها بواسطة المساعد الذكي مُعين',
          updatedAt: new Date().toISOString().substring(0, 16)
        }));
        setAiFoundStations(mapped);
      } else {
        setImportMessage('لم يتم العثور على محطات جديدة في هذا النطاق، يمكنك إدخال المحطة يدوياً.');
      }
    } catch (err) {
      console.error(err);
      setImportMessage('حدث خطأ أثناء فحص المحطات بالذكاء الاصطناعي.');
    } finally {
      setIsAiSearching(false);
    }
  };

  const handleAddAiStation = (station: Station) => {
    onSaveStations([station, ...stations]);
    setAiFoundStations(prev => prev.filter(s => s.id !== station.id));
  };

  // Config Save
  const handleSaveAppConfig = () => {
    const updated = { ...localConfig };
    if (newPasswordInput.trim()) {
      updated.adminPassword = newPasswordInput.trim();
    }
    onSaveConfig(updated);
    setConfigSuccess(true);
    setTimeout(() => setConfigSuccess(false), 3000);
  };

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-3 md:p-6 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-emerald-500/40 rounded-3xl p-5 md:p-7 shadow-2xl text-white max-h-[92vh] flex flex-col">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg">
              <Settings className="w-6 h-6 animate-spin-slow" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-400">
                لوحة تحكم مدير النظام | شركة عزوتي للبرمجيات
              </div>
              <h2 className="text-xl md:text-2xl font-black">
                إدارة محطات الغاز الطبيعي والمساعد مُعين
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Authentication Gate */}
        {!isAuthenticated ? (
          <div className="py-12 flex flex-col items-center justify-center max-w-sm mx-auto text-center">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-4 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold">تسجيل دخول مدير المنظومة</h3>
            <p className="text-xs text-slate-400 mt-2">
              تم الوصول عبر النقر 5 مرات على الأيقونة. كلمة السر الافتراضية هي <span className="text-emerald-400 font-bold">0000</span>
            </p>

            <form onSubmit={handleLogin} className="w-full mt-6 space-y-3">
              <div>
                <input
                  type="password"
                  value={inputPassword}
                  onChange={(e) => setInputPassword(e.target.value)}
                  placeholder="أدخل كلمة المرور (0000)"
                  className="w-full text-center tracking-widest px-4 py-3 rounded-2xl bg-slate-800 border border-slate-700 text-white text-lg font-bold focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                {authError && (
                  <p className="text-xs text-rose-400 mt-2 font-medium">{authError}</p>
                )}
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-2xl shadow-lg cursor-pointer"
              >
                دخول لوحة التحكم
              </button>
            </form>
          </div>
        ) : (
          /* Main Dashboard Content with Tabs */
          <div className="flex-1 flex flex-col min-h-0 mt-4">
            {/* Tabs Navigation */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800 shrink-0">
              <button
                onClick={() => setActiveTab('stations')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'stations'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Fuel className="w-4 h-4" />
                <span>المحطات ({stations.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('import')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'import'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Upload className="w-4 h-4" />
                <span>استيراد Google Earth / KML</span>
              </button>

              <button
                onClick={() => setActiveTab('ai-discovery')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'ai-discovery'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>اكتشاف وتدقيق المحطات بالذكاء الاصطناعي</span>
              </button>

              <button
                onClick={() => setActiveTab('moein')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'moein'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Bot className="w-4 h-4 text-cyan-300" />
                <span>المساعد مُعين (صوت وإعدادات)</span>
              </button>

              <button
                onClick={() => setActiveTab('settings')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shrink-0 ${
                  activeTab === 'settings'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Palette className="w-4 h-4" />
                <span>المظهر وكلمة السر</span>
              </button>
            </div>

            {/* Tab 1: Stations Management */}
            {activeTab === 'stations' && (
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                {isAddingNew ? (
                  /* Station Form */
                  <form onSubmit={handleSaveStation} className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <h4 className="font-bold text-emerald-400">
                        {editingStation ? 'تعديل بيانات المحطة' : 'إضافة محطة غاز جديدة إلى الخريطة'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        إلغاء
                      </button>
                    </div>

                    {formError && (
                      <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-bold">
                        {formError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-slate-300 block mb-1">اسم المحطة:</label>
                        <input
                          type="text"
                          required
                          value={stationForm.name || ''}
                          onChange={(e) => setStationForm({ ...stationForm, name: e.target.value })}
                          placeholder="مثال: محطة عربية غاز - أول عباس العقاد"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">الشركة المالكة:</label>
                        <select
                          value={stationForm.company || 'كارجاس'}
                          onChange={(e) => setStationForm({ ...stationForm, company: e.target.value as CompanyName })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        >
                          <option value="كارجاس">كارجاس (Cargas)</option>
                          <option value="عربية غاز">عربية غاز (Arabia Gas)</option>
                          <option value="غازتك">غازتك (Gastec)</option>
                          <option value="ماستر جاس">ماستر جاس / طاقة</option>
                          <option value="وطنية">وطنية / شيل أوت</option>
                          <option value="أخرى">أخرى / مستقلة</option>
                        </select>
                      </div>

                      <div className="md:col-span-2">
                        <label className="text-xs text-slate-300 block mb-1">العنوان التفصيلي:</label>
                        <input
                          type="text"
                          required
                          value={stationForm.address || ''}
                          onChange={(e) => setStationForm({ ...stationForm, address: e.target.value })}
                          placeholder="مثال: طريق النصر تقاطع عباس العقاد، مدينة نصر"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">خط العرض (Latitude):</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={stationForm.lat || ''}
                          onChange={(e) => setStationForm({ ...stationForm, lat: parseFloat(e.target.value) })}
                          placeholder="30.0638"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">خط الطول (Longitude):</label>
                        <input
                          type="number"
                          step="any"
                          required
                          value={stationForm.lng || ''}
                          onChange={(e) => setStationForm({ ...stationForm, lng: parseFloat(e.target.value) })}
                          placeholder="31.3325"
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">عدد مسدسات الغاز (Nozzles):</label>
                        <input
                          type="number"
                          value={stationForm.cngNozzles || 8}
                          onChange={(e) => setStationForm({ ...stationForm, cngNozzles: parseInt(e.target.value) || 4 })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">حالة الزحام الحالية:</label>
                        <select
                          value={stationForm.congestionLevel || 'low'}
                          onChange={(e) => setStationForm({ ...stationForm, congestionLevel: e.target.value as CongestionLevel })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        >
                          <option value="low">🟢 خفيف ومريح (انتظار 2-5 دقيقة)</option>
                          <option value="medium">🟡 متوسط (انتظار 10 دقيقة)</option>
                          <option value="high">🔴 شديد (انتظار 20+ دقيقة)</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">وقت الانتظار المتوقع (بالدقائق):</label>
                        <input
                          type="number"
                          value={stationForm.waitTimeMinutes || 4}
                          onChange={(e) => setStationForm({ ...stationForm, waitTimeMinutes: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-slate-300 block mb-1">ساعات العمل:</label>
                        <input
                          type="text"
                          value={stationForm.workingHours || '24 ساعة'}
                          onChange={(e) => setStationForm({ ...stationForm, workingHours: e.target.value })}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-sm"
                        />
                      </div>
                    </div>

                    {/* Checkboxes */}
                    <div className="flex flex-wrap gap-4 pt-2">
                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stationForm.cng ?? true}
                          onChange={(e) => setStationForm({ ...stationForm, cng: e.target.checked })}
                          className="accent-emerald-500 rounded"
                        />
                        <span>غاز طبيعي مضغوط (CNG)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stationForm.petrol ?? false}
                          onChange={(e) => setStationForm({ ...stationForm, petrol: e.target.checked })}
                          className="accent-emerald-500 rounded"
                        />
                        <span>بنزين (92 / 95)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stationForm.verified ?? true}
                          onChange={(e) => setStationForm({ ...stationForm, verified: e.target.checked })}
                          className="accent-emerald-500 rounded"
                        />
                        <span className="text-emerald-400 font-bold">محطة موثقة 100% (تستبعد المحطات الوهمية)</span>
                      </label>

                      <label className="flex items-center gap-2 text-xs text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stationForm.conversionCenter ?? false}
                          onChange={(e) => setStationForm({ ...stationForm, conversionCenter: e.target.checked })}
                          className="accent-emerald-500 rounded"
                        />
                        <span>مركز صيانة وتحويل غاز</span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => setIsAddingNew(false)}
                        className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-xl text-xs font-semibold"
                      >
                        إلغاء
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold"
                      >
                        حفظ المحطة
                      </button>
                    </div>
                  </form>
                ) : (
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-xs text-slate-400">
                        قائمة المحطات المعتمدة المعروضة للمستخدمين على الخريطة
                      </div>
                      <button
                        onClick={handleOpenAdd}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg"
                      >
                        <Plus className="w-4 h-4" />
                        <span>إضافة محطة يدوياً</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {stations.map(station => (
                        <div
                          key={station.id}
                          className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700/80 flex items-center justify-between gap-3 hover:border-slate-600 transition"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-sm text-white truncate">{station.name}</span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                                {station.company}
                              </span>
                              {station.verified && (
                                <span className="text-[10px] text-emerald-400 font-bold">✓ موثقة</span>
                              )}
                              <span className="text-[10px] text-amber-400">
                                انتظار {station.waitTimeMinutes} د
                              </span>
                            </div>
                            <p className="text-xs text-slate-400 truncate mt-0.5">
                              {station.address} ({station.lat.toFixed(4)}, {station.lng.toFixed(4)})
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => handleOpenEdit(station)}
                              className="p-2 bg-slate-700 hover:bg-slate-600 text-white rounded-xl cursor-pointer"
                              title="تعديل المحطة"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            {deletingId === station.id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => confirmDeleteStation(station.id)}
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-xs font-bold"
                                >
                                  تأكيد الحذف
                                </button>
                                <button
                                  onClick={() => setDeletingId(null)}
                                  className="px-2 py-1 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-xs"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeletingId(station.id)}
                                className="p-2 bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white rounded-xl cursor-pointer"
                                title="حذف المحطة"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Google Earth / KML Import */}
            {activeTab === 'import' && (
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
                  <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                    <FileCode className="w-5 h-5" />
                    استيراد خريطة المحطات من Google Earth (KML / KMZ / CSV)
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    كما تفضلت، خرائط جوجل أحياناً تضع علامات غير حقيقية أو محطات بنزين عادية دون غاز. يمكنك هنا رفع ملف خريطتك من جوجل إيرث (.kml) بكل العلامات واللوجوهات الموثقة لديك، أو لصق الكود مباشرة ليقوم التطبيق بتوليدها فوراً على الخريطة!
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <label className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-md">
                      <Upload className="w-4 h-4" />
                      <span>اختر ملف من جهازك (.kml أو .csv)</span>
                      <input
                        type="file"
                        accept=".kml,.xml,.csv,.json,.geojson"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>

                    <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-700">
                      <span className="text-xs text-slate-400">صيغة البيانات:</span>
                      <button
                        onClick={() => setImportType('kml')}
                        className={`text-xs px-2 py-1 rounded ${importType === 'kml' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        KML (Google Earth)
                      </button>
                      <button
                        onClick={() => setImportType('csv')}
                        className={`text-xs px-2 py-1 rounded ${importType === 'csv' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        CSV / Excel
                      </button>
                      <button
                        onClick={() => setImportType('geojson')}
                        className={`text-xs px-2 py-1 rounded ${importType === 'geojson' ? 'bg-emerald-600 text-white' : 'text-slate-400'}`}
                      >
                        GeoJSON
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <label className="text-xs text-slate-300 block mb-1 font-semibold">
                      أو الصق نص ملف KML / CSV هنا مباشرة:
                    </label>
                    <textarea
                      rows={6}
                      value={pastedData}
                      onChange={(e) => setPastedData(e.target.value)}
                      placeholder='الصق كود KML من Google Earth هنا... مثال: <Placemark><name>عربية غاز عباس العقاد</name><coordinates>31.3325,30.0638,0</coordinates></Placemark>'
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={handleParseImport}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                    >
                      معاينة واستخراج المحطات
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const kml = exportStationsToKML(stations);
                          const blob = new Blob([kml], { type: 'application/vnd.google-earth.kml+xml' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'cng-stations-export.kml';
                          a.click();
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير KML لجوجل إيرث</span>
                      </button>
                      <button
                        onClick={() => {
                          const csv = exportStationsToCSV(stations);
                          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = 'cng-stations-export.csv';
                          a.click();
                        }}
                        className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-semibold rounded-xl flex items-center gap-1 cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>تصدير CSV / إكسيل</span>
                      </button>
                    </div>
                  </div>

                  {importMessage && (
                    <div className="mt-3 p-3 bg-slate-900/80 rounded-xl text-xs text-amber-300 border border-amber-500/30">
                      {importMessage}
                    </div>
                  )}
                </div>

                {/* Import Preview Cards */}
                {importPreview.length > 0 && (
                  <div className="bg-slate-800/40 p-4 rounded-2xl border border-slate-700 space-y-3">
                    <div className="flex items-center justify-between">
                      <h5 className="text-xs font-bold text-emerald-400">
                        معاينة المحطات المستخرجة من الملف ({importPreview.length} محطة):
                      </h5>
                      <button
                        onClick={handleApplyImport}
                        className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-black rounded-xl shadow-lg cursor-pointer"
                      >
                        تأكيد وإضافة الكل للخريطة الآن
                      </button>
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {importPreview.map((s, idx) => (
                        <div key={idx} className="p-2.5 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-bold text-white">{s.name}</span>
                            <span className="text-slate-400 mr-2">({s.company})</span>
                            <div className="text-[11px] text-slate-400">{s.address}</div>
                          </div>
                          <span className="text-emerald-400 font-mono">{s.lat.toFixed(4)}, {s.lng.toFixed(4)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: AI Discovery & Verification */}
            {activeTab === 'ai-discovery' && (
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700">
                  <h4 className="text-sm font-bold text-amber-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    استكشاف وتدقيق محطات الغاز الحقيقية بمصر عبر الذكاء الاصطناعي
                  </h4>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    يقوم النموذج بالبحث عن محطات الغاز الطبيعي (كارجاس، عربية غاز، غازتك، ماستر جاس) والتأكد من أنها توفر غاز طبيعي حقيقي وليست محطات بنزين وهمية، مع إمكانية إضافتها بضغطة زر واحدة.
                  </p>

                  <div className="mt-4 flex gap-2">
                    <input
                      type="text"
                      value={aiSearchQuery}
                      onChange={(e) => setAiSearchQuery(e.target.value)}
                      placeholder="أدخل المنطقة أو المحافظة (مثال: مدينة نصر، المعادي، الشيخ زايد، الإسكندرية)"
                      className="flex-1 px-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-white text-xs"
                    />
                    <button
                      onClick={handleDiscoverStations}
                      disabled={isAiSearching}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer shadow"
                    >
                      {isAiSearching ? 'جارِ التدقيق...' : 'ابحث ودقق المحطات'}
                    </button>
                  </div>
                </div>

                {/* AI Results */}
                {aiFoundStations.length > 0 && (
                  <div className="space-y-2">
                    <h5 className="text-xs font-bold text-emerald-400">
                      محطات تم العثور عليها وتدقيقها جاهزة للإضافة:
                    </h5>
                    {aiFoundStations.map((station) => (
                      <div
                        key={station.id}
                        className="p-3 bg-slate-800/60 rounded-2xl border border-slate-700 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{station.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-700 text-slate-300">
                              {station.company}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">✓ موثقة CNG</span>
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{station.address}</p>
                          {station.notes && <p className="text-[11px] text-amber-300/80">{station.notes}</p>}
                        </div>

                        <button
                          onClick={() => handleAddAiStation(station)}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shrink-0 cursor-pointer"
                        >
                          إضافة للخريطة
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Moein Assistant Controls */}
            {activeTab === 'moein' && (
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-cyan-300 flex items-center gap-2">
                        <Bot className="w-5 h-5 text-cyan-400" />
                        التحكم في المساعد الذكي "مُعين" (شركة عزوتي للبرمجيات)
                      </h4>
                      <p className="text-xs text-slate-300 mt-1">
                        يمكنك هنا تحديد ظهور مُعين للمستخدمين، وتحديد ما يقوله وما لا يقوله لحماية أفكار التطبيق وسره التجاري كما تفضلت.
                      </p>
                    </div>

                    <label className="flex items-center gap-2 cursor-pointer bg-slate-900 px-3.5 py-2 rounded-xl border border-slate-700">
                      <span className="text-xs font-semibold text-slate-200">
                        {localConfig.moeinVisibleToUsers ? 'مُفعل وظاهر للمستخدمين' : 'مخفي عن المستخدمين (للمدير فقط)'}
                      </span>
                      <input
                        type="checkbox"
                        checked={localConfig.moeinVisibleToUsers}
                        onChange={(e) => setLocalConfig({ ...localConfig, moeinVisibleToUsers: e.target.checked })}
                        className="accent-cyan-500 w-4 h-4 rounded"
                      />
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-semibold">
                        الإرشاد الصوتي لمُعين:
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <input
                          type="checkbox"
                          checked={localConfig.moeinVoiceEnabled}
                          onChange={(e) => setLocalConfig({ ...localConfig, moeinVoiceEnabled: e.target.checked })}
                          className="accent-emerald-500 w-4 h-4"
                        />
                        <span className="text-xs text-slate-200">
                          نطق الإرشادات بصوت بشري مصري ودود تلقائياً
                        </span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-semibold">
                        تنبيهات حالة الزحام اللحظية:
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-3 rounded-xl border border-slate-800">
                        <input
                          type="checkbox"
                          checked={localConfig.trafficCrowdAlertsEnabled}
                          onChange={(e) => setLocalConfig({ ...localConfig, trafficCrowdAlertsEnabled: e.target.checked })}
                          className="accent-amber-500 w-4 h-4"
                        />
                        <span className="text-xs text-slate-200">
                          تنبيه السائق صوتياً عند اختيار محطة ذات زحام شديد
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-semibold">
                      توجيهات سرية لمُعين (تعليمات مدير النظام للمراجعة والتحكم في الردود):
                    </label>
                    <textarea
                      rows={3}
                      value={localConfig.moeinCustomPromptNote || ''}
                      onChange={(e) => setLocalConfig({ ...localConfig, moeinCustomPromptNote: e.target.value })}
                      placeholder="اكتب هنا أي تعليمات ترغب في أن يلتزم بها معين (مثلاً: ركز دائماً على محطات كارجاس وعربية غاز، لا تذكر تفاصيل العقود الداخلية، إلخ)"
                      className="w-full p-3 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end">
                    <button
                      onClick={handleSaveAppConfig}
                      className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-1.5"
                    >
                      <Save className="w-4 h-4" />
                      <span>حفظ إعدادات مُعين</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 5: Appearance, Password & Custom Texts */}
            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto mt-4 space-y-4">
                <div className="bg-slate-800/60 p-4 rounded-2xl border border-slate-700 space-y-4">
                  <h4 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                    <Palette className="w-5 h-5 text-emerald-400" />
                    تخصيص المظهر، نصوص التطبيق، وكلمة سر المدير
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-semibold">
                        عنوان التطبيق الرئيسي:
                      </label>
                      <input
                        type="text"
                        value={localConfig.appTitle}
                        onChange={(e) => setLocalConfig({ ...localConfig, appTitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-semibold">
                        العنوان الفرعي:
                      </label>
                      <input
                        type="text"
                        value={localConfig.appSubtitle}
                        onChange={(e) => setLocalConfig({ ...localConfig, appSubtitle: e.target.value })}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-semibold">
                        تغيير كلمة سر مدير النظام (الحالية: {config.adminPassword}):
                      </label>
                      <input
                        type="text"
                        value={newPasswordInput}
                        onChange={(e) => setNewPasswordInput(e.target.value)}
                        placeholder="اترك فارغاً للإبقاء على 0000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-slate-300 block mb-1 font-semibold">
                        حقوق وشعار شركة عزوتي (المطور محمد عبد الرحمن يوسف):
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer bg-slate-900 p-2.5 rounded-xl border border-slate-800 mt-1">
                        <input
                          type="checkbox"
                          checked={localConfig.ezoutiBadgeVisible}
                          onChange={(e) => setLocalConfig({ ...localConfig, ezoutiBadgeVisible: e.target.checked })}
                          className="accent-emerald-500 w-4 h-4"
                        />
                        <span className="text-xs text-slate-200">إظهار شارة الاعتماد الحصري في أسفل التطبيق</span>
                      </label>
                    </div>
                  </div>

                  <div className="flex justify-end pt-3">
                    <button
                      onClick={handleSaveAppConfig}
                      className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow cursor-pointer flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      <span>تطبيق وحفظ التعديلات</span>
                    </button>
                  </div>

                  {configSuccess && (
                    <div className="p-3 bg-emerald-950/80 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>تم حفظ كافة الإعدادات وكلمة المرور بنجاح!</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
