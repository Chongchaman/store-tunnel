import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  Minus, 
  History, 
  Layout, 
  AlertCircle, 
  Edit2, 
  Trash2, 
  CheckCircle2, 
  X,
  Loader2,
  Box,
  MapPin,
  TrendingDown,
  Activity,
  BarChart3,
  ArrowRight,
  ShoppingCart,
  Calendar
} from 'lucide-react';

// --- SUB-COMPONENTS ---
const ModalWrapper = ({ title, children, color, onClose, onSubmit, loading }) => (
  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
    <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
      <div className={`p-5 ${color} text-white flex justify-between items-center`}>
        <h3 className="font-bold text-lg">{title}</h3>
        <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-lg transition-colors"><X size={24} /></button>
      </div>
      <form onSubmit={onSubmit} className="p-6 space-y-4">
        {children}
        <div className="flex gap-3 pt-4 border-t mt-6">
          <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-slate-100 rounded-xl hover:bg-slate-200 font-bold transition-colors text-slate-600">ยกเลิก</button>
          <button type="submit" className={`flex-1 px-4 py-3 ${color} text-white rounded-xl hover:opacity-90 font-bold shadow-lg transition-all flex items-center justify-center gap-2`} disabled={loading}>
            {loading ? <Loader2 className="animate-spin" size={20} /> : 'ยืนยันรายการ'}
          </button>
        </div>
      </form>
    </div>
  </div>
);

const App = () => {
  // --- CONFIGURATION ---
  const API_URL = "https://script.google.com/macros/s/AKfycbx8MAuy78ki13ZOnq5DX7GH1jMocEXZ7DZr6g-Rgrn93WI1xAnkxcV8MMz-JoSGE9fp/exec"; // ใส่ URL ของ Google Apps Script ที่ Deploy แล้วที่นี่
  
  // --- STATE ---
  const [view, setView] = useState('dashboard');
  const [stock, setStock] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [dashboardData, setDashboardData] = useState({ lowStockItems: [], dailyUsageChart: [] });
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modal, setModal] = useState(null); 
  const [selectedItem, setSelectedItem] = useState(null);
  const [formData, setFormData] = useState({ qty: 1, requestor: '', site: '', remark: '', barcode: '', itemName: '', unit: '', location: '', minQty: 1 });
  const [statusMsg, setStatusMsg] = useState(null);

  // --- DATA FETCHING ---
  const fetchData = async () => {
    if (!API_URL) return;
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const data = await response.json();
      setStock(data.stock || []);
      setTransactions(data.transactions || []);
      if (data.dashboard) {
        setDashboardData(data.dashboard);
      }
    } catch (error) {
      showStatus('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ (เช็ค API_URL)', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (API_URL) fetchData();
  }, [API_URL]);

  // --- COMPUTED DATA ---
  const stats = useMemo(() => {
    const today = new Date().toLocaleDateString('en-CA'); 
    const todayTxns = transactions.filter(t => t.DateTime?.includes(today));
    
    return {
      totalItems: stock.length,
      lowStockCount: dashboardData.lowStockCount || 0,
      todayTxnsCount: todayTxns.length
    };
  }, [stock, transactions, dashboardData]);

  // --- ACTIONS ---
  const showStatus = (msg, type = 'success') => {
    setStatusMsg({ msg, type });
    setTimeout(() => setStatusMsg(null), 3000);
  };

  const handleOpenModal = (type, item = null) => {
    setSelectedItem(item);
    if (type === 'EDIT' && item) {
      setFormData({ 
        itemName: item.ItemName || '', 
        unit: item.Unit || '', 
        location: item.Location || '', 
        minQty: item.MinQty || 1,
        barcode: item.Barcode || ''
      });
    } else if (type === 'NEW') {
      setFormData({ barcode: '', itemName: '', unit: '', location: '', qty: 0, minQty: 1, requestor: '', site: '', remark: '' });
    } else {
      setFormData({ qty: 1, requestor: '', site: '', remark: '', barcode: item?.Barcode || '', itemName: item?.ItemName || '' });
    }
    setModal(type);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!API_URL) {
      showStatus('กรุณาตั้งค่า API_URL ก่อน', 'error');
      return;
    }
    setLoading(true);
    
    let action = modal;
    let finalQty = Number(formData.qty || 0);
    
    if (modal === 'OUT') finalQty = -Math.abs(finalQty);
    if (modal === 'IN') finalQty = Math.abs(finalQty);
    if (modal === 'NEW') action = 'ADD_NEW';

    const payload = {
      action: action,
      Barcode: selectedItem?.Barcode || formData.barcode,
      ItemName: formData.itemName || selectedItem?.ItemName,
      Unit: formData.unit || selectedItem?.Unit,
      Location: formData.location || selectedItem?.Location,
      Qty: finalQty,
      MinQty: Number(formData.minQty || 0),
      Requestor: formData.requestor || 'System',
      Project: formData.site || '-',
      Remark: formData.remark || ''
    };

    try {
      await fetch(API_URL, {
        method: 'POST',
        mode: 'no-cors',
        body: JSON.stringify(payload)
      });
      
      setTimeout(() => {
        showStatus('บันทึกข้อมูลเรียบร้อย');
        setModal(null);
        fetchData();
      }, 1000);

    } catch (error) {
      showStatus('การส่งข้อมูลล้มเหลว', 'error');
    } finally {
      setLoading(false);
    }
  };

  const filteredStock = stock.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.ItemName?.toString().toLowerCase().includes(searchLower) ||
      item.Barcode?.toString().toLowerCase().includes(searchLower) ||
      item.Location?.toString().toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9] text-slate-900 pb-10">
      <nav className="bg-white/80 backdrop-blur-md border-b sticky top-0 z-40 shadow-sm font-sans">
        <div className="max-w-7xl mx-auto px-4 flex justify-between h-16 items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200"><Package size={22} /></div>
            <span className="font-black text-xl tracking-tight hidden sm:block text-slate-800 uppercase">Store Tunnel</span>
          </div>
          <div className="flex bg-slate-100 p-1 rounded-2xl">
            {[
              { id: 'dashboard', icon: Layout, label: 'แดชบอร์ด' },
              { id: 'inventory', icon: Box, label: 'คลังพัสดุ' },
              { id: 'history', icon: History, label: 'ประวัติ' }
            ].map(tab => (
              <button 
                key={tab.id}
                onClick={() => setView(tab.id)} 
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${view === tab.id ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
              >
                <tab.icon size={16} /> <span className="hidden md:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-4 md:p-8">
        {statusMsg && (
          <div className={`fixed top-20 right-4 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-right duration-300 ${statusMsg.type === 'success' ? 'bg-emerald-600 text-white' : 'bg-rose-600 text-white'}`}>
            {statusMsg.type === 'success' ? <CheckCircle2 size={24} /> : <AlertCircle size={24} />}
            <span className="font-bold">{statusMsg.msg}</span>
          </div>
        )}

        {view === 'dashboard' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl font-black text-slate-800 uppercase">System Overview</h1>
                <p className="text-slate-500 font-medium italic">Dashboard วิเคราะห์คลังพัสดุหน้างาน</p>
              </div>
              <div className="bg-white px-4 py-2 rounded-2xl shadow-sm border flex items-center gap-2 text-slate-400 font-bold text-sm">
                <Calendar size={16} />
                {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}
              </div>
            </header>

            {/* Top Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 group-hover:scale-110 transition-transform"><Box size={100} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl"><Box size={24} /></div>
                  <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-2 py-1 rounded-lg uppercase tracking-widest">Inventory</span>
                </div>
                <div className="text-5xl font-black text-slate-800 tracking-tighter">{stats.totalItems}</div>
                <div className="text-slate-400 text-sm font-bold mt-1">รายการพัสดุที่ลงทะเบียน</div>
              </div>

              <div className={`p-6 rounded-3xl border shadow-sm transition-all relative overflow-hidden group ${stats.lowStockCount > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'}`}>
                <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 group-hover:scale-110 transition-transform"><AlertCircle size={100} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`p-3 rounded-2xl ${stats.lowStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-50 text-slate-400'}`}><TrendingDown size={24} /></div>
                  <span className={`text-[10px] font-black px-2 py-1 rounded-lg uppercase tracking-widest ${stats.lowStockCount > 0 ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-400'}`}>Urgent</span>
                </div>
                <div className={`text-5xl font-black tracking-tighter ${stats.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{stats.lowStockCount}</div>
                <div className="text-slate-400 text-sm font-bold mt-1">รายการที่ต้องสั่งเพิ่มทันที</div>
              </div>

              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 -mr-4 -mt-4 group-hover:scale-110 transition-transform"><Activity size={100} /></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl"><Activity size={24} /></div>
                  <span className="text-[10px] font-black bg-emerald-50 text-emerald-600 px-2 py-1 rounded-lg uppercase tracking-widest">Today</span>
                </div>
                <div className="text-5xl font-black text-slate-800 tracking-tighter">{stats.todayTxnsCount}</div>
                <div className="text-slate-400 text-sm font-bold mt-1">จำนวนรายการเบิก-คืนวันนี้</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Daily Usage Graph */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <div className="flex justify-between items-center mb-8">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                      <BarChart3 className="text-blue-600" size={24} />
                      สถิติเบิกพัสดุ (7 วัน)
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Daily Withdrawal Usage</p>
                  </div>
                </div>
                
                <div className="h-64 flex items-end gap-3 md:gap-6 pt-4">
                  {dashboardData.dailyUsageChart?.length > 0 ? (
                    dashboardData.dailyUsageChart.map((data, idx) => {
                      const maxUsage = Math.max(...dashboardData.dailyUsageChart.map(d => d.usage)) || 10;
                      const barHeight = (data.usage / maxUsage) * 100;
                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center gap-4 group">
                          <div className="relative w-full flex justify-center">
                            {/* Bar */}
                            <div 
                              style={{ height: `${barHeight}%` }}
                              className={`w-full max-w-[40px] rounded-t-xl transition-all duration-700 ease-out min-h-[4px] relative ${idx === 6 ? 'bg-blue-600 shadow-lg shadow-blue-200' : 'bg-slate-200 group-hover:bg-slate-300'}`}
                            >
                              <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-[10px] font-black text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity bg-white border px-2 py-1 rounded shadow-sm">
                                {data.usage}
                              </div>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black uppercase ${idx === 6 ? 'text-blue-600' : 'text-slate-400'}`}>{data.date}</span>
                        </div>
                      );
                    })
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-300 italic text-sm">ยังไม่มีข้อมูลการเบิก</div>
                  )}
                </div>
              </div>

              {/* Critical Stock List */}
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col">
                <div className="flex justify-between items-center mb-6">
                  <div>
                    <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                      <ShoppingCart className="text-rose-600" size={24} />
                      พัสดุที่ต้องสั่งเพิ่ม
                    </h3>
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Low Stock Items To Purchase</p>
                  </div>
                  <button onClick={() => setView('inventory')} className="text-blue-600 hover:bg-blue-50 p-2 rounded-xl transition-colors"><ArrowRight size={24} /></button>
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto max-h-72 pr-2 custom-scrollbar">
                  {dashboardData.lowStockItems?.length > 0 ? (
                    dashboardData.lowStockItems.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group hover:border-rose-200 transition-colors">
                        <div className="flex items-center gap-4 overflow-hidden">
                          <div className="bg-white p-3 rounded-xl border border-slate-200 text-rose-600 shadow-sm"><Package size={20} /></div>
                          <div className="overflow-hidden">
                            <p className="font-black text-slate-800 truncate">{item.ItemName}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-slate-400 font-mono tracking-tight bg-white px-2 py-0.5 rounded border">#{item.Barcode}</span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase"><MapPin size={10} className="inline mr-1" />{item.Location || '-'}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-lg font-black text-rose-600 leading-none">{item.Qty}</div>
                          <div className="text-[10px] font-bold text-slate-400 uppercase">{item.Unit}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 py-10">
                      <CheckCircle2 size={48} className="text-emerald-500/20 mb-2" />
                      <p className="font-bold">พัสดุในคลังเพียงพอทุกรายการ</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {view === 'inventory' && (
          <div className="space-y-6 animate-in fade-in duration-300">
             <div className="flex flex-col md:flex-row gap-4 items-center">
              <div className="relative flex-1 w-full">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input 
                  type="text"
                  placeholder="ค้นหาพัสดุ (ชื่อ, บาร์โค้ด, สถานที่)..."
                  className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/10 transition-all font-medium shadow-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <button onClick={() => handleOpenModal('NEW')} className="w-full md:w-auto bg-blue-600 text-white px-8 py-4 rounded-2xl flex items-center justify-center gap-2 font-bold hover:bg-blue-700 shadow-lg transition-all">
                <Plus size={20} strokeWidth={3} /> เพิ่มรายการใหม่
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredStock.map((item, idx) => {
                const isLow = Number(item.Qty) <= Number(item.MinQty);
                return (
                  <div key={idx} className="bg-white border border-slate-200 rounded-[2rem] p-6 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative">
                    {isLow && <div className="absolute top-0 right-0 bg-rose-500 text-white text-[9px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest z-10 shadow-sm animate-pulse">Low Stock</div>}
                    <div className="flex justify-between items-start mb-5">
                      <div className="space-y-1 max-w-[70%]">
                        <div className="text-[10px] font-black text-slate-300 tracking-widest uppercase">#{item.Barcode}</div>
                        <h3 className="font-bold text-xl text-slate-800 truncate">{item.ItemName}</h3>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenModal('EDIT', item)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-xl transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleOpenModal('DELETE', item)} className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"><Trash2 size={16} /></button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div className={`p-4 rounded-2xl border text-center transition-colors ${isLow ? 'bg-rose-50 border-rose-200' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`text-4xl font-black ${isLow ? 'text-rose-600' : 'text-slate-800'}`}>{item.Qty}</div>
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{item.Unit}</div>
                      </div>
                      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex flex-col justify-center text-center">
                        <div className="text-[10px] text-slate-400 font-black uppercase tracking-tighter mb-1">Location</div>
                        <div className="text-xs font-bold text-slate-600 truncate">{item.Location || '-'}</div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleOpenModal('IN', item)} className="flex-1 py-4 bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white rounded-2xl font-black transition-all shadow-sm hover:shadow-emerald-100">คืนพัสดุ</button>
                      <button onClick={() => handleOpenModal('OUT', item)} className="flex-1 py-4 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white rounded-2xl font-black transition-all shadow-sm hover:shadow-rose-100">เบิกพัสดุ</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view === 'history' && (
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200 overflow-hidden animate-in fade-in duration-300">
             <div className="p-8 border-b">
               <h3 className="text-xl font-black text-slate-800 uppercase flex items-center gap-2">
                 <History className="text-blue-600" size={24} /> ประวัติธุรกรรม
               </h3>
               <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">Transaction Audit Logs</p>
             </div>
             <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50">
                  <tr className="font-black text-slate-400 text-[10px] uppercase tracking-widest border-b">
                    <th className="px-8 py-5">Date / Time</th>
                    <th className="px-8 py-5">Item Details</th>
                    <th className="px-8 py-5 text-center">Action</th>
                    <th className="px-8 py-5 text-right">Qty</th>
                    <th className="px-8 py-5">Operator / Project</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {transactions.map((t, i) => (
                    <tr key={i} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-8 py-5">
                        <div className="text-slate-800 font-bold text-sm">{t.DateTime.split(' ')[0]}</div>
                        <div className="text-slate-400 font-mono text-[10px]">{t.DateTime.split(' ')[1]}</div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-slate-800">{t.ItemName}</div>
                        <div className="text-[10px] font-bold text-slate-400 font-mono">#{t.Barcode}</div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`px-3 py-1 rounded-full text-[10px] font-black tracking-tighter ${t.Action === 'IN' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{t.Action}</span>
                      </td>
                      <td className={`px-8 py-5 text-right font-black text-lg ${t.Action === 'IN' ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {t.Action === 'IN' ? '+' : '-'}{Math.abs(t.Qty)}
                      </td>
                      <td className="px-8 py-5">
                        <div className="font-bold text-xs text-slate-700">{t.Requestor}</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">{t.Project}</div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {transactions.length === 0 && (
              <div className="py-20 text-center text-slate-300 font-bold italic italic">ไม่พบข้อมูลประวัติ</div>
            )}
          </div>
        )}
      </main>

      {/* --- MODAL RENDERING --- */}
      {modal === 'NEW' && (
        <ModalWrapper title="จดทะเบียนพัสดุใหม่" color="bg-blue-600" loading={loading} onClose={() => setModal(null)} onSubmit={handleSubmit}>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Barcode</label><input type="text" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold focus:ring-2 focus:ring-blue-600/20 transition-all" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">ชื่อพัสดุ</label><input type="text" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold focus:ring-2 focus:ring-blue-600/20 transition-all" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">หน่วยนับ</label><input type="text" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold focus:ring-2 focus:ring-blue-600/20 transition-all" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} /></div>
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Location</label><input type="text" className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold focus:ring-2 focus:ring-blue-600/20 transition-all" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">จำนวนตั้งต้น</label><input type="number" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-black focus:ring-2 focus:ring-blue-600/20 transition-all" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} /></div>
            <div><label className="text-[10px] font-black text-rose-500 uppercase tracking-widest ml-1">จุดสั่งเพิ่ม (Min Qty)</label><input type="number" required className="w-full p-3 bg-rose-50 border border-rose-100 rounded-xl outline-none font-black focus:ring-2 focus:ring-rose-600/20 transition-all" value={formData.minQty} onChange={e => setFormData({...formData, minQty: e.target.value})} /></div>
          </div>
        </ModalWrapper>
      )}

      {(modal === 'IN' || modal === 'OUT') && (
        <ModalWrapper title={modal === 'IN' ? 'คืนพัสดุ' : 'เบิกพัสดุ'} color={modal === 'IN' ? 'bg-emerald-600' : 'bg-rose-600'} loading={loading} onClose={() => setModal(null)} onSubmit={handleSubmit}>
          <div className="bg-slate-100 p-4 rounded-2xl mb-4 text-center">
            <div className="font-black text-slate-800 truncate text-lg uppercase tracking-tight">{selectedItem?.ItemName}</div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">คงเหลือปัจจุบัน: {selectedItem?.Qty} {selectedItem?.Unit}</div>
          </div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">จำนวนที่เบิก/คืน</label><input type="number" required autoFocus className="w-full text-5xl font-black p-4 rounded-2xl border-2 text-center outline-none focus:border-blue-500 transition-all bg-white" value={formData.qty} onChange={e => setFormData({...formData, qty: e.target.value})} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">ผู้รับผิดชอบ</label><input type="text" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold" value={formData.requestor} onChange={e => setFormData({...formData, requestor: e.target.value})} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">โครงการ / หน้างาน</label><input type="text" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold" value={formData.site} onChange={e => setFormData({...formData, site: e.target.value})} /></div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">หมายเหตุ</label><input type="text" className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold" value={formData.remark} onChange={e => setFormData({...formData, remark: e.target.value})} /></div>
        </ModalWrapper>
      )}

      {modal === 'EDIT' && (
        <ModalWrapper title="แก้ไขข้อมูลพัสดุ" color="bg-indigo-600" loading={loading} onClose={() => setModal(null)} onSubmit={handleSubmit}>
          <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">ชื่อรายการ</label><input type="text" required className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold" value={formData.itemName} onChange={e => setFormData({...formData, itemName: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">หน่วย</label><input type="text" className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold" value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} /></div>
            <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">Location</label><input type="text" className="w-full p-3 bg-slate-100 rounded-xl outline-none font-bold" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} /></div>
          </div>
          <div><label className="text-[10px] font-black text-slate-400 uppercase ml-1">จุดสั่งเพิ่ม (Min Qty)</label><input type="number" className="w-full p-3 bg-slate-100 rounded-xl outline-none font-black" value={formData.minQty} onChange={e => setFormData({...formData, minQty: e.target.value})} /></div>
        </ModalWrapper>
      )}

      {modal === 'DELETE' && (
        <ModalWrapper title="ยืนยันการลบ" color="bg-rose-600" loading={loading} onClose={() => setModal(null)} onSubmit={handleSubmit}>
          <div className="text-center py-6">
            <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center text-rose-600 mx-auto mb-4 border-2 border-rose-100"><Trash2 size={40} /></div>
            <p className="text-slate-500 font-medium">ต้องการลบรายการนี้ออกจากระบบคลัง?</p>
            <p className="font-black text-2xl text-slate-800 mt-2 uppercase tracking-tight">"{selectedItem?.ItemName}"</p>
            <p className="text-[10px] font-bold text-rose-400 uppercase mt-4">* ข้อมูลประวัติการเบิกคืนจะยังคงอยู่ในชีต Transactions</p>
          </div>
        </ModalWrapper>
      )}
    </div>
  );
};

export default App;