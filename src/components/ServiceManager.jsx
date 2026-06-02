import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // প্রজেক্ট অনুযায়ী পাথ চেক করে নেবেন

const ServiceManager = () => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // ১ম সেকশনের স্টেট
    const [searchInvoice, setSearchInvoice] = useState('');
    const [chalanItemsList, setChalanItemsList] = useState([]); // চালানের আন্ডারে থাকা প্রোডাক্টের লিস্ট
    const [selectedItem, setSelectedItem] = useState(null); // যে প্রোডাক্টটি সিলেক্ট করা হয়েছে

    // ২য় সেকশনের স্টেট
    const [showServiceSection, setShowServiceSection] = useState(false);
    const [formData, setFormData] = useState({
        bill_no: '',
        chalan_no: '',
        inv_type: 'Hybrid',
        sl_no: '', 
        serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
        serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
        serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
        serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
    });

    // ১. ১ম সেকশন: চালান বা বিল নম্বর দিয়ে সার্চ করার লজিক (৩টি টেবিল রিলেশন অনুযায়ী)
    const handleChalanSearch = async (e) => {
        e.preventDefault();
        if (!searchInvoice.trim()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });
        setChalanItemsList([]);
        setSelectedItem(null);
        setShowServiceSection(false);

        try {
            // প্রথমে chalans টেবিল থেকে chalan_no বা bill_no ম্যাচ করে আইডি বের করা
            const { data: chalanData, error: chalanError } = await supabase
                .from('chalans')
                .select('id, chalan_no, bill_no, date')
                .or(`chalan_no.eq.${searchInvoice.trim()},bill_no.eq.${searchInvoice.trim()}`)
                .maybeSingle();

            if (chalanError) throw chalanError;

            if (!chalanData) {
                setMessage({ type: 'error', text: 'এই চালান বা বিল নম্বরটি ডাটাবেজে পাওয়া যায়নি!' });
                setLoading(false);
                return;
            }

            // এবার chalan_items টেবিল থেকে ওই chalan_id এর সব প্রোডাক্ট এবং products টেবিল থেকে নাম-মডেল তুলে আনা
            const { data: itemsData, error: itemsError } = await supabase
                .from('chalan_items')
                .select(`
                    id,
                    serial_no,
                    product_id,
                    products (
                        product_name,
                        model
                    )
                `)
                .eq('chalan_id', chalanData.id);

            if (itemsError) throw itemsError;

            if (itemsData && itemsData.length > 0) {
                // ম্যাপ করে লিস্ট তৈরি করা যেন ড্রপডাউন বা লিস্টে দেখানো যায়
                const formattedItems = itemsData.map(item => ({
                    chalan_item_id: item.id,
                    serial_no: item.serial_no || '',
                    product_name: item.products?.product_name || 'Unknown Product',
                    model: item.products?.model || 'N/A',
                    chalan_no: chalanData.chalan_no,
                    bill_no: chalanData.bill_no || '',
                    sale_date: chalanData.date
                }));

                setChalanItemsList(formattedItems);
                setMessage({ type: 'success', text: `এই চালানের অধীনে ${formattedItems.length} টি প্রোডাক্ট পাওয়া গেছে।` });
            } else {
                setMessage({ type: 'warning', text: 'এই চালানের অধীনে কোনো প্রোডাক্টের এন্ট্রি পাওয়া যায়নি।' });
            }

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'অনুসন্ধানে সমস্যা হয়েছে: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // ২. নির্দিষ্ট প্রোডাক্ট সিলেক্ট বা সিরিয়াল এন্ট্রি হ্যান্ডলার
    const handleSelectProduct = async (item) => {
        setSelectedItem(item);
        
        // ২য় সেকশনের বেসিক ফর্ম ডেটা সেট করা
        setFormData(prev => ({
            ...prev,
            bill_no: item.bill_no,
            chalan_no: item.chalan_no,
            sl_no: item.serial_no // যদি আগে থেকেই chalan_items এ সিরিয়াল এন্ট্রি থাকে
        }));

        // যদি সিরিয়াল নাম্বার আগে থেকেই থাকে, তবে সরাসরি inv_sl টেবিল থেকে সার্ভিসের ডাটা খুঁজবে
        if (item.serial_no) {
            await fetchServiceHistory(item.serial_no);
        } else {
            setShowServiceSection(true);
            // আগে সিরিয়াল না থাকলে সার্ভিসের ফিল্ডগুলো খালি করে দেওয়া
            setFormData(prev => ({
                ...prev,
                serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
                serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
                serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
                serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
            }));
        }
    };

    // ৩. সিরিয়াল নাম্বারের সার্ভিস হিস্টোরি খোঁজার ফাংশন
    const fetchServiceHistory = async (serialNo) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('inv_sl')
                .select('*')
                .eq('sl_no', serialNo.trim())
                .maybeSingle();

            if (error) throw error;

            if (data) {
                setFormData(data);
                setMessage({ type: 'info', text: 'এই সিরিয়াল নাম্বারের পূর্বের সার্ভিস রেকর্ড লোড হয়েছে।' });
            } else {
                setMessage({ type: 'warning', text: 'এই সিরিয়াল নাম্বারের কোনো সার্ভিস রেকর্ড নেই। নতুন এন্ট্রি করতে পারেন।' });
            }
            setShowServiceSection(true);
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'সার্ভিস ডাটা লোড করতে সমস্যা: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // ৪. ১ম সেকশনে সিরিয়াল নাম্বার ইনপুট বা আপডেট দেওয়ার সাবমিট লজিক
    const handleSerialSubmit = async (e) => {
        e.preventDefault();
        if (!formData.sl_no.trim() || !selectedItem) return;

        setLoading(true);
        try {
            // প্রথমে chalan_items টেবিলে সিরিয়াল নম্বরটি সেভ/আপডেট করা
            const { error: itemUpdateError } = await supabase
                .from('chalan_items')
                .update({ serial_no: formData.sl_no.trim() })
                .eq('id', selectedItem.chalan_item_id);

            if (itemUpdateError) throw itemUpdateError;

            // লিস্ট আপডেট করা যাতে ইউজার ইন্টারফেসে লাইভ দেখায়
            setChalanItemsList(prev => prev.map(i => 
                i.chalan_item_id === selectedItem.chalan_item_id ? { ...i, serial_no: formData.sl_no.trim() } : i
            ));

            // এবার inv_sl টেবিল থেকে সার্ভিসের হিস্টোরি লোড করা
            await fetchServiceHistory(formData.sl_no);

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'সিরিয়াল নম্বর আপডেট করতে ব্যর্থ: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // ৫. ২য় সেকশন: অল সার্ভিস ডাটা সেভ বা আপডেট করার লজিক (Upsert)
    const handleServiceSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase
                .from('inv_sl')
                .upsert([formData], { onConflict: 'sl_no' });

            if (error) throw error;
            setMessage({ type: 'success', text: '🎉 সার্ভিসের যাবতীয় তথ্য সফলভাবে inv_sl টেবিল এ সংরক্ষণ করা হয়েছে!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'সংরক্ষণ করতে সমস্যা হয়েছে: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerSection}>
                <h2 style={styles.title}>🛠️ ইনভার্টার সার্ভিস ও ওয়ারেন্টি ড্যাশবোর্ড</h2>
                <p style={styles.subtitle}>চালান/বিল নম্বর ট্র্যাকিং সিস্টেম ও সার্ভিস এন্ট্রি মডিউল</p>
            </div>

            {/* মেসেজ বা অ্যালার্ট ডিসপ্লে */}
            {message.text && (
                <div style={{...styles.alert, ...styles[message.type]}}>
                    {message.text}
                </div>
            )}

            {/* ================= ১ম সেকশন ================= */}
            <div style={styles.sectionCard}>
                <h3 style={styles.sectionTitle}>১ম সেকশন: চালান অনুসন্ধান ও সিরিয়াল এন্ট্রি</h3>
                
                <div style={styles.layoutGrid1}>
                    {/* বাম পাশ: চালান সার্চ এবং আইটেম লিস্ট */}
                    <div>
                        <form onSubmit={handleChalanSearch} style={styles.searchForm}>
                            <label style={styles.label}>বিল অথবা চালান নম্বর</label>
                            <div style={styles.searchContainer}>
                                <input 
                                    type="text" 
                                    placeholder="যেমন: BILL-1024 বা CH-5021" 
                                    value={searchInvoice}
                                    onChange={(e) => setSearchInvoice(e.target.value)}
                                    style={styles.searchInput}
                                />
                                <button type="submit" style={styles.searchButton} disabled={loading}>
                                    🔍 খুঁজুন
                                </button>
                            </div>
                        </form>

                        {/* চালানের আন্ডারে থাকা প্রোডাক্টের লিস্ট */}
                        {chalanItemsList.length > 0 && (
                            <div style={{marginTop: '20px'}}>
                                <label style={styles.label}>প্রোডাক্ট সিলেক্ট করুন:</label>
                                <div style={styles.itemListContainer}>
                                    {chalanItemsList.map((item) => (
                                        <div 
                                            key={item.chalan_item_id} 
                                            onClick={() => handleSelectProduct(item)}
                                            style={{
                                                ...styles.productItemCard, 
                                                borderColor: selectedItem?.chalan_item_id === item.chalan_item_id ? '#ea580c' : '#e2e8f0',
                                                background: selectedItem?.chalan_item_id === item.chalan_item_id ? '#fff7f5' : '#fff'
                                            }}
                                        >
                                            <div>
                                                <span style={styles.productNameText}>{item.product_name}</span>
                                                <span style={styles.productModelText}>মডেল: {item.model}</span>
                                            </div>
                                            <span style={{
                                                ...styles.serialBadge,
                                                background: item.serial_no ? '#e0f2fe' : '#fee2e2',
                                                color: item.serial_no ? '#0369a1' : '#991b1b'
                                            }}>
                                                {item.serial_no ? `SL: ${item.serial_no}` : 'সিরিয়াল নেই'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* ডান পাশ: সিলেক্ট করা আইটেমের বিস্তারিত এবং সিরিয়াল নাম্বার এন্ট্রি ফিল্ড */}
                    {selectedItem && (
                        <div style={styles.serialEntryBox}>
                            <h4 style={styles.infoTitle}>📋 চালানের বিবরণ ও সিরিয়াল ম্যানেজমেন্ট</h4>
                            <div style={styles.infoRow}><strong>চালান নং:</strong> <span>{selectedItem.chalan_no}</span></div>
                            <div style={styles.infoRow}><strong>বিল নং:</strong> <span>{selectedItem.bill_no || 'N/A'}</span></div>
                            <div style={styles.infoRow}><strong>বিক্রয় তারিখ:</strong> <span>{selectedItem.sale_date}</span></div>
                            
                            <form onSubmit={handleSerialSubmit} style={{marginTop: '20px'}}>
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>সিরিয়াল নম্বর ইনপুট দিন (SL No)</label>
                                    <input 
                                        type="text" 
                                        name="sl_no"
                                        placeholder="ইনভার্টারের সিরিয়াল নাম্বারটি লিখুন" 
                                        value={formData.sl_no} 
                                        onChange={handleChange}
                                        style={styles.input}
                                        required
                                    />
                                </div>
                                <button type="submit" style={styles.proceedButton} disabled={loading}>
                                    {selectedItem.serial_no ? '🔄 সিরিয়াল পরিবর্তন ও সার্ভিস লোড করুন' : '🔑 সিরিয়াল যুক্ত ও সার্ভিস ওপেন করুন'}
                                </button>
                            </form>
                        </div>
                    )}
                </div>
            </div>

            {/* ================= ২য় সেকশন ================= */}
            {showServiceSection && (
                <div style={{...styles.sectionCard, marginTop: '30px'}} className="animate-in fade-in duration-300">
                    <div style={styles.serviceSectionHeader}>
                        <h3 style={styles.sectionTitle}>২য় সেকশন: ইনভার্টার সার্ভিস হিস্টোরি ও নতুন ইনপুট</h3>
                        <div style={{display: 'flex', gap: '10px', alignItems: 'center'}}>
                            <div style={styles.inputGroup, {flexDirection: 'row', gap: '10px', alignItems: 'center', marginBottom: 0}}>
                                <label style={styles.label, {marginBottom: 0}}>টাইপ:</label>
                                <select name="inv_type" value={formData.inv_type} onChange={handleChange} style={styles.selectInput}>
                                    <option value="Hybrid">Hybrid</option>
                                    <option value="On-Grid">On-Grid</option>
                                </select>
                            </div>
                            <span style={styles.activeSerialBadge}>Active SL: {formData.sl_no}</span>
                        </div>
                    </div>

                    <form onSubmit={handleServiceSave}>
                        <div style={styles.serviceGrid}>
                            {[1, 2, 3, 4].map((num) => (
                                <div key={num} style={styles.serviceCard}>
                                    <div style={styles.serviceCardHeader}>
                                        <span style={styles.serviceBadge}>0{num}</span>
                                        <h4 style={styles.serviceCardTitle}>সার্ভিস রেকর্ড - ০{num}</h4>
                                    </div>
                                    
                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>সার্ভিসের তারিখ</label>
                                        <input type="text" name={`serv_${num}_date`} placeholder="DD-MM-YYYY" value={formData[`serv_${num}_date`] || ''} onChange={handleChange} style={styles.input} />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>সমস্যা / প্রবলেম বিবরণ</label>
                                        <textarea name={`serv_${num}_problem`} placeholder="কী সমস্যা হয়েছিল বিস্তারিত লিখুন..." value={formData[`serv_${num}_problem`] || ''} onChange={handleChange} style={styles.textarea} />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>সার্ভিস বিল / খরচ (৳)</label>
                                        <input type="number" name={`serv_${num}_amount`} placeholder="অ্যামাউন্ট" value={formData[`serv_${num}_amount`] || ''} onChange={handleChange} style={styles.input} />
                                    </div>

                                    <div style={styles.inputGroup}>
                                        <label style={styles.label}>মন্তব্য (Remarks)</label>
                                        <input type="text" name={`remarks${num}`} placeholder="অতিরিক্ত কোনো তথ্য..." value={formData[`remarks${num}`] || ''} onChange={handleChange} style={styles.input} />
                                    </div>
                                </div>
                            ))}
                        </div>

                        <button type="submit" style={styles.submitButton} disabled={loading}>
                            {loading ? 'ডাটাবেজে সেভ হচ্ছে...' : 'পাবলিশ করুন (Save All Service Data to inv_sl)'}
                        </button>
                    </form>
                </div>
            )}
        </div>
    );
};

// কাস্টম রিডিজাইনড স্টাইলশীট (স্ক্রিনশটের মডেল এন্ট্রি থিমের সাথে মিল রেখে)
const styles = {
    container: { maxWidth: '1280px', margin: '0 auto', padding: '30px 20px', fontFamily: "'Hind Siliguri', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh' },
    headerSection: { marginBottom: '25px' },
    title: { color: '#0f172a', fontSize: '26px', fontWeight: '700', marginBottom: '5px' },
    subtitle: { color: '#64748b', fontSize: '14px' },
    sectionCard: { background: '#fff', borderRadius: '16px', padding: '25px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05)' },
    sectionTitle: { fontSize: '18px', fontWeight: '700', color: '#0f172a', marginBottom: '20px', borderBottom: '2px solid #f1f5f9', paddingBottom: '10px' },
    layoutGrid1: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', alignItems: 'start' },
    searchForm: { marginBottom: '15px' },
    searchContainer: { display: 'flex', background: '#f1f5f9', borderRadius: '10px', padding: '5px 10px', border: '1px solid #cbd5e1', marginTop: '6px' },
    searchInput: { flex: 1, border: 'none', background: 'transparent', padding: '10px', fontSize: '15px', outline: 'none', color: '#334155' },
    searchButton: { padding: '10px 20px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', fontSize: '14px' },
    
    // প্রোডাক্ট লিস্টের জন্য সিএসএস
    itemListContainer: { display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px', maxHeight: '250px', overflowY: 'auto', paddingRight: '5px' },
    productItemCard: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s' },
    productNameText: { display: 'block', fontSize: '14px', fontWeight: '700', color: '#1e293b' },
    productModelText: { display: 'block', fontSize: '12px', color: '#64748b', marginTop: '2px' },
    serialBadge: { padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: '600' },

    serialEntryBox: { background: '#fff9f5', padding: '25px', borderRadius: '12px', border: '1px solid #ffedd5' },
    inputGroup: { display: 'flex', flexDirection: 'column', marginBottom: '15px' },
    label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
    input: { padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', color: '#334155', outline: 'none', background: '#fff' },
    selectInput: { padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#334155', outline: 'none', background: '#fff' },
    textarea: { padding: '12px 14px', border: '1px solid #cbd5e1', borderRadius: '10px', fontSize: '14px', color: '#334155', minHeight: '80px', outline: 'none', resize: 'vertical' },
    infoTitle: { fontSize: '15px', fontWeight: '700', color: '#1e293b', marginBottom: '15px' },
    infoRow: { display: 'flex', justifyContent: 'space-between', fontSize: '14px', color: '#334155', padding: '8px 0', borderBottom: '1px dashed #e2e8f0' },
    proceedButton: { width: '100%', padding: '14px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '14px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgb(2 132 199 / 0.2)' },
    
    serviceSectionHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' },
    activeSerialBadge: { background: '#0f172a', color: '#fff', padding: '6px 14px', borderRadius: '20px', fontSize: '13px', fontWeight: '600' },
    serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '20px', marginBottom: '25px' },
    serviceCard: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.05)' },
    serviceCardHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px', borderBottom: '1px solid #f1f5f9', paddingBottom: '10px' },
    serviceBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '26px', height: '26px', borderRadius: '50%', background: '#ffedd5', color: '#ea580c', fontSize: '12px', fontWeight: '700' },
    serviceCardTitle: { fontSize: '14px', fontWeight: '700', color: '#1e293b' },
    submitButton: { width: '100%', padding: '16px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', fontSize: '16px', fontWeight: '700', boxShadow: '0 10px 15px -3px rgb(234 88 12 / 0.2)', transition: 'all 0.2s', marginTop: '10px' },
    
    alert: { padding: '14px', borderRadius: '10px', marginBottom: '20px', fontSize: '14px', fontWeight: '500' },
    success: { background: '#dcfce7', color: '#155724', border: '1px solid #bbf7d0' },
    error: { background: '#fee2e2', color: '#721c24', border: '1px solid #fecaca' },
    info: { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
    warning: { background: '#fef3c7', color: '#856404', border: '1px solid #fde68a' }
};

export default ServiceManager;