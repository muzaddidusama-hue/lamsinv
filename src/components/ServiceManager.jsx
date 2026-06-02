import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // আপনার প্রজেক্টের সুপাবেস ক্লায়েন্ট পাথ অনুযায়ী চেক করে নেবেন

const ServiceManager = () => {
    // সার্চ এবং ইনপুট স্টেট
    const [searchSlNo, setSearchSlNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // প্রোডাক্টের বেসিক ইনফো (অন্যান্য টেবিল থেকে আসবে)
    const [productInfo, setProductInfo] = useState(null);

    // inv_sl টেবিলের ডাটা স্টেট
    const [formData, setFormData] = useState({
        bill_no: '',
        chalan_no: '',
        inv_type: 'Hybrid', // Default
        sl_no: '',
        serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
        serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
        serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
        serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
    });

    // সিরিয়াল নাম্বার দিয়ে সার্চ করার লজিক
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchSlNo.trim()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });
        setProductInfo(null);

        try {
            // ১. আপনার বিক্রয় বা স্টক টেবিল থেকে প্রোডাক্টের নাম, মডেল ও ডেট খুঁজুন
            // (এখানে 'sales_items' এবং কলামের নাম আপনার ডাটাবেজ অনুযায়ী পরিবর্তন করে নেবেন)
            const { data: productData, error: productError } = await supabase
                .from('sales_items') // আপনার আসল সেলস/স্টক টেবিলের নাম এখানে হবে
                .select('product_name, model, sale_date, bill_no, chalan_no, type')
                .eq('serial_no', searchSlNo.trim())
                .single();

            if (productError && productError.code !== 'PGRST116') throw productError;

            // ২. এবার inv_sl টেবিল থেকে এক্সিস্টিং সার্ভিসের ডাটা চেক করুন
            const { data: serviceData, error: serviceError } = await supabase
                .from('inv_sl')
                .select('*')
                .eq('sl_no', searchSlNo.trim())
                .single();

            if (serviceError && serviceError.code !== 'PGRST116') throw serviceError;

            // যদি সেলস টেবিলে ডাটা পাওয়া যায়
            if (productData) {
                setProductInfo({
                    name: productData.product_name,
                    model: productData.model,
                    date: productData.sale_date
                });
            }

            // যদি সার্ভিস টেবিলে আগে থেকেই ডাটা থাকে তবে ফর্ম ফিল্ড লোড হবে, না হলে নতুন এন্ট্রি হবে
            if (serviceData) {
                setFormData(serviceData);
                setMessage({ type: 'info', text: 'এই সিরিয়াল নাম্বারের আগের সার্ভিস রেকর্ড পাওয়া গেছে।' });
            } else {
                // নতুন এন্ট্রি হলে বিল, চালান ও সিরিয়াল অটো-ফিল হবে (যদি সেলস টেবিলে থাকে)
                setFormData({
                    bill_no: productData?.bill_no || '',
                    chalan_no: productData?.chalan_no || '',
                    inv_type: productData?.type || 'Hybrid',
                    sl_no: searchSlNo.trim(),
                    serv_1_date: '', serv_1_problem: '', serv_1_amount: '', remarks1: '',
                    serv_2_date: '', serv_2_problem: '', serv_2_amount: '', remarks2: '',
                    serv_3_date: '', serv_3_problem: '', serv_3_amount: '', remarks3: '',
                    serv_4_date: '', serv_4_problem: '', serv_4_amount: '', remarks4: '',
                });
                if (!productData) {
                    setMessage({ type: 'warning', text: 'সেলার/স্টক টেবিলে এই সিরিয়াল পাওয়া যায়নি, তবে আপনি নতুন সার্ভিস এন্ট্রি করতে পারবেন।' });
                }
            }

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'ডাটা লোড করতে সমস্যা হয়েছে: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    // ইনপুট চেঞ্জ হ্যান্ডলার
    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value
        });
    };

    // ডাটা সাবমিট বা আপডেট করার লজিক (Upsert)
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            // upsert ব্যবহার করলে ডাটা থাকলে আপডেট হবে, না থাকলে নতুন রো তৈরি হবে
            const { error } = await supabase
                .from('inv_sl')
                .upsert([formData], { onConflict: 'sl_no' }); // sl_no ইউনিক ধরে কনফ্লিক্ট হ্যান্ডেল করবে

            if (error) throw error;

            setMessage({ type: 'success', text: 'সার্ভিস লিস্ট সফলভাবে ডাটাবেজে আপডেট হয়েছে!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'সেভ করতে সমস্যা হয়েছে: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <h2 style={styles.title}>ইনভার্টার সার্ভিস ম্যানেজমেন্ট (inv_sl)</h2>

            {/* সার্চ সেকশন */}
            <form onSubmit={handleSearch} style={styles.searchForm}>
                <input 
                    type="text" 
                    placeholder="ইনভার্টার সিরিয়াল নাম্বার দিয়ে সার্চ করুন..." 
                    value={searchSlNo}
                    onChange={(e) => setSearchSlNo(e.target.value)}
                    style={styles.searchInput}
                />
                <button type="submit" style={styles.searchButton} disabled={loading}>
                    {loading ? 'খোঁজা হচ্ছে...' : 'সার্চ করুন'}
                </button>
            </form>

            {/* মেসেজ ডিসপ্লে */}
            {message.text && (
                <div style={{...styles.alert, ...styles[message.type]}}>
                    {message.text}
                </div>
            )}

            {/* প্রোডাক্টের বেসিক ইনফো ডিসপ্লে */}
            {productInfo && (
                <div style={styles.infoBox}>
                    <h3>🔍 প্রোডাক্টের বিবরণ (সেলস/স্টক রেকর্ড)</h3>
                    <p><strong>ইনভার্টার নাম:</strong> {productInfo.name}</p>
                    <p><strong>মডেল:</strong> {productInfo.model}</p>
                    <p><strong>বিক্রয়ের তারিখ:</strong> {productInfo.date}</p>
                </div>
            )}

            {/* মূল ইনপুট ফর্ম */}
            {formData.sl_no && (
                <form onSubmit={handleSubmit} style={styles.mainForm}>
                    
                    {/* বেসিক চালান ও বিল তথ্য */}
                    <div style={styles.row}>
                        <div style={styles.col}>
                            <label style={styles.label}>বিল নম্বর (Bill No)</label>
                            <input type="text" name="bill_no" value={formData.bill_no} onChange={handleChange} style={styles.input} required />
                        </div>
                        <div style={styles.col}>
                            <label style={styles.label}>চালান নম্বর (Chalan No)</label>
                            <input type="text" name="chalan_no" value={formData.chalan_no} onChange={handleChange} style={styles.input} required />
                        </div>
                        <div style={styles.col}>
                            <label style={styles.label}>ইনভার্টার টাইপ</label>
                            <select name="inv_type" value={formData.inv_type} onChange={handleChange} style={styles.input}>
                                <option value="Hybrid">Hybrid (হাইব্রিড)</option>
                                <option value="On-Grid">On-Grid (অন-গ্রিড)</option>
                            </select>
                        </div>
                        <div style={styles.col}>
                            <label style={styles.label}>সিরিয়াল নং (স্থির)</label>
                            <input type="text" value={formData.sl_no} disabled style={{...styles.input, backgroundColor: '#e9ecef'}} />
                        </div>
                    </div>

                    <hr style={styles.divider} />

                    {/* ৪টি সার্ভিসের লুপ/গ্রিড */}
                    <div style={styles.serviceGrid}>
                        {[1, 2, 3, 4].map((num) => (
                            <div key={num} style={styles.serviceCard}>
                                <h4 style={styles.serviceCardTitle}>🛠️ সার্ভিস সেগমেন্ট - 0{num}</h4>
                                
                                <label style={styles.label}>সার্ভিস তারিখ</label>
                                <input type="text" name={`serv_${num}_date`} placeholder="উদা: 12-05-2026" value={formData[`serv_${num}_date`]} onChange={handleChange} style={styles.input} />

                                <label style={styles.label}>সমস্যা / প্রবলেম</label>
                                <textarea name={`serv_${num}_problem`} placeholder="কী সমস্যা হয়েছিল..." value={formData[`serv_${num}_problem`]} onChange={handleChange} style={styles.textarea} />

                                <label style={styles.label}>সার্ভিস অ্যামাউন্ট (টাকা)</label>
                                <input type="number" name={`serv_${num}_amount`} placeholder="অ্যামাউন্ট" value={formData[`serv_${num}_amount`]} onChange={handleChange} style={styles.input} />

                                <label style={styles.label}>মন্তব্য (Remarks)</label>
                                <input type="text" name={`remarks${num}`} placeholder="মন্তব্য লিখুন..." value={formData[`remarks${num}`]} onChange={handleChange} style={styles.input} />
                            </div>
                        ))}
                    </div>

                    <button type="submit" style={styles.submitButton} disabled={loading}>
                        {loading ? 'ডাটা সেভ হচ্ছে...' : 'ডাটাবেজে সংরক্ষণ করুন (Save / Update)'}
                    </button>
                </form>
            )}
        </div>
    );
};

// ইনলাইন সিএসএস স্টাইলস (Hind Siliguri ফন্ট সাপোর্টসহ মডার্ন ডার্ক/লাইট ক্লিন কম্বিনেশন)
const styles = {
    container: { maxWidth: '1100px', margin: '0 auto', padding: '20px', fontFamily: "'Hind Siliguri', sans-serif" },
    title: { color: '#004d40', borderBottom: '3px solid #ff6f00', paddingBottom: '10px', marginBottom: '25px' },
    searchForm: { display: 'flex', gap: '10px', marginBottom: '20px' },
    searchInput: { flex: 1, padding: '12px', border: '1px solid #ccc', borderRadius: '6px', fontSize: '16px' },
    searchButton: { padding: '12px 25px', background: '#004d40', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '16px' },
    infoBox: { background: '#e0f2f1', padding: '15px', borderRadius: '8px', marginBottom: '25px', borderLeft: '5px solid #004d40' },
    mainForm: { background: '#fff', padding: '25px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' },
    row: { display: 'flex', flexWrap: 'wrap', gap: '15px', marginBottom: '15px' },
    col: { flex: '1 1 220px', display: 'flex', flexDirection: 'column' },
    label: { fontSize: '14px', fontWeight: 'bold', marginBottom: '5px', color: '#333' },
    input: { padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '14px', marginBottom: '10px' },
    textarea: { padding: '10px', border: '1px solid #ccc', borderRadius: '5px', fontSize: '14px', minHeight: '60px', marginBottom: '10px', resize: 'vertical' },
    divider: { margin: '25px 0', border: '0', borderTop: '1px solid #ddd' },
    serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', marginBottom: '25px' },
    serviceCard: { background: '#f9f9f9', padding: '15px', borderRadius: '8px', border: '1px solid #eaeaea' },
    serviceCardTitle: { color: '#ff6f00', marginBottom: '12px', borderBottom: '1px dashed #ccc', paddingBottom: '5px' },
    submitButton: { width: '100%', padding: '15px', background: '#ff6f00', color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' },
    alert: { padding: '12px', borderRadius: '6px', marginBottom: '20px', fontWeight: 'bold' },
    success: { background: '#d4edda', color: '#155724' },
    error: { background: '#f8d7da', color: '#721c24' },
    info: { background: '#d1ecf1', color: '#0c5460' },
    warning: { background: '#fff3cd', color: '#856404' }
};

export default ServiceManager;