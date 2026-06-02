import React, { useState } from 'react';
import { supabase } from '../supabaseClient'; // আপনার প্রজেক্ট অনুযায়ী পাথ চেক করে নেবেন

const ServiceManager = () => {
    const [searchSlNo, setSearchSlNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });
    const [productInfo, setProductInfo] = useState(null);

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

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchSlNo.trim()) return;

        setLoading(true);
        setMessage({ type: '', text: '' });
        setProductInfo(null);

        try {
            // সেলস বা কাস্টমার টেবিল থেকে তথ্য খোঁজা (আপনার আসল টেবিলের নাম এখানে বসাবেন)
            const { data: productData, error: productError } = await supabase
                .from('sales_items') 
                .select('product_name, model, sale_date, bill_no, chalan_no, type')
                .eq('serial_no', searchSlNo.trim())
                .single();

            if (productError && productError.code !== 'PGRST116') throw productError;

            // inv_sl টেবিল থেকে সার্ভিসের তথ্য খোঁজা
            const { data: serviceData, error: serviceError } = await supabase
                .from('inv_sl')
                .select('*')
                .eq('sl_no', searchSlNo.trim())
                .single();

            if (serviceError && serviceError.code !== 'PGRST116') throw serviceError;

            if (productData) {
                setProductInfo({
                    name: productData.product_name,
                    model: productData.model,
                    date: productData.sale_date
                });
            }

            if (serviceData) {
                setFormData(serviceData);
                setMessage({ type: 'info', text: 'এই সিরিয়াল নাম্বারের আগের সার্ভিস রেকর্ড পাওয়া গেছে।' });
            } else {
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
                    setMessage({ type: 'warning', text: 'সেলস রেকর্ডে এই সিরিয়াল পাওয়া যায়নি, তবে নতুন সার্ভিস এন্ট্রি করতে পারবেন।' });
                }
            }

        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'ডাটা লোড করতে সমস্যা হয়েছে: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const { error } = await supabase
                .from('inv_sl')
                .upsert([formData], { onConflict: 'sl_no' });

            if (error) throw error;
            setMessage({ type: 'success', text: 'সার্ভিস রেকর্ড সফলভাবে ডাটাবেজে সংরক্ষণ করা হয়েছে!' });
        } catch (error) {
            console.error(error);
            setMessage({ type: 'error', text: 'সেভ করতে সমস্যা হয়েছে: ' + error.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={styles.container}>
            <div style={styles.headerSection}>
                <h2 style={styles.title}>🛠️ ইনভার্টার সার্ভিস ও ওয়ারেন্টি ট্র্যাকিং</h2>
                <p style={styles.subtitle}>সিরিয়াল নাম্বার দিয়ে সার্চ করুন এবং সার্ভিসের বিবরণ আপডেট করুন</p>
            </div>

            {/* সার্চ বার */}
            <form onSubmit={handleSearch} style={styles.searchForm}>
                <div style={styles.searchContainer}>
                    <span style={styles.searchIcon}>🔍</span>
                    <input 
                        type="text" 
                        placeholder="ইনভার্টার সিরিয়াল নাম্বারটি এখানে লিখুন..." 
                        value={searchSlNo}
                        onChange={(e) => setSearchSlNo(e.target.value)}
                        style={styles.searchInput}
                    />
                </div>
                <button type="submit" style={styles.searchButton} disabled={loading}>
                    {loading ? 'খোঁজা হচ্ছে...' : 'অনুসন্ধান করুন'}
                </button>
            </form>

            {/* মেসেজ বা অ্যালার্ট */}
            {message.text && (
                <div style={{...styles.alert, ...styles[message.type]}}>
                    {message.text}
                </div>
            )}

            {/* মূল গ্রিড লেআউট (স্ক্রিনশটের মতো দুই কলাম) */}
            {formData.sl_no && (
                <form onSubmit={handleSubmit}>
                    <div style={styles.layoutGrid}>
                        
                        {/* বাম কলাম: বেসিক ও কাস্টমার/প্রোডাক্ট ইনফো */}
                        <div style={styles.leftColumn}>
                            <div style={styles.card}>
                                <h3 style={styles.cardTitle}>📦 প্রোডাক্ট ও চালানের বিবরণ</h3>
                                
                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>সিরিয়াল নম্বর (স্থির)</label>
                                    <input type="text" value={formData.sl_no} disabled style={styles.disabledInput} />
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>বিল নম্বর (Bill No)</label>
                                    <input type="text" name="bill_no" value={formData.bill_no} onChange={handleChange} style={styles.input} required placeholder="উদা: BILL-1024" />
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>চালান নম্বর (Chalan No)</label>
                                    <input type="text" name="chalan_no" value={formData.chalan_no} onChange={handleChange} style={styles.input} required placeholder="উদা: CH-5021" />
                                </div>

                                <div style={styles.inputGroup}>
                                    <label style={styles.label}>ইনভার্টার টাইপ</label>
                                    <select name="inv_type" value={formData.inv_type} onChange={handleChange} style={styles.selectInput}>
                                        <option value="Hybrid">Hybrid (হাইব্রিড)</option>
                                        <option value="On-Grid">On-Grid (অন-গ্রিড)</option>
                                    </select>
                                </div>
                            </div>

                            {/* এক্সিস্টিং সেলস রেকর্ড থাকলে অটো দেখাবে */}
                            {productInfo && (
                                <div style={{...styles.card, ...styles.infoCard}}>
                                    <h4 style={styles.infoCardTitle}>📋 ডাটাবেজ সেলস রেকর্ড</h4>
                                    <div style={styles.infoRow}><strong>নাম:</strong> <span>{productInfo.name}</span></div>
                                    <div style={styles.infoRow}><strong>মডেল:</strong> <span>{productInfo.model}</span></div>
                                    <div style={styles.infoRow}><strong>বিক্রয় তারিখ:</strong> <span>{productInfo.date}</span></div>
                                </div>
                            )}
                        </div>

                        {/* ডান কলাম: ৪টি সার্ভিস হিস্টোরি কার্ড */}
                        <div style={styles.rightColumn}>
                            <div style={styles.serviceGrid}>
                                {[1, 2, 3, 4].map((num) => (
                                    <div key={num} style={styles.serviceCard}>
                                        <div style={styles.serviceHeader}>
                                            <span style={styles.serviceBadge}>0{num}</span>
                                            <h4 style={styles.serviceTitle}>সার্ভিস রেকর্ড {num}</h4>
                                        </div>
                                        
                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>সার্ভিসের তারিখ</label>
                                            <input type="text" name={`serv_${num}_date`} placeholder="DD-MM-YYYY" value={formData[`serv_${num}_date`]} onChange={handleChange} style={styles.input} />
                                        </div>

                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>সমস্যা (Problem)</label>
                                            <textarea name={`serv_${num}_problem`} placeholder="কী সমস্যা হয়েছিল বিস্তারিত লিখুন..." value={formData[`serv_${num}_problem`]} onChange={handleChange} style={styles.textarea} />
                                        </div>

                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>সার্ভিস খরচ / বিল (৳)</label>
                                            <input type="number" name={`serv_${num}_amount`} placeholder="টাকার পরিমাণ" value={formData[`serv_${num}_amount`]} onChange={handleChange} style={styles.input} />
                                        </div>

                                        <div style={styles.inputGroup}>
                                            <label style={styles.label}>মন্তব্য (Remarks)</label>
                                            <input type="text" name={`remarks${num}`} placeholder="অতিরিক্ত তথ্য..." value={formData[`remarks${num}`]} onChange={handleChange} style={styles.input} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                    </div>

                    {/* নিচের বড় সাবমিট বাটন */}
                    <div style={styles.actionContainer}>
                        <button type="submit" style={styles.submitButton} disabled={loading}>
                            {loading ? 'ডাটা সংরক্ষণ করা হচ্ছে...' : '💾 অল ডাটা আপডেট করুন (Save Changes)'}
                        </button>
                    </div>
                </form>
            )}
        </div>
    );
};

// আপনার নতুন UI স্ক্রিনশট থিমের ওপর ভিত্তি করে চমৎকার কাস্টম সিএসএস স্টাইলস
const styles = {
    container: { maxWidth: '1280px', margin: '0 auto', padding: '30px 20px', fontFamily: "'Hind Siliguri', sans-serif", backgroundColor: '#f8fafc', minHeight: '100vh' },
    headerSection: { marginBottom: '30px', textAlign: 'left' },
    title: { color: '#0f172a', fontSize: '26px', fontWeight: '700', marginBottom: '5px' },
    subtitle: { color: '#64748b', fontSize: '14px' },
    
    // সার্চ বার স্টাইল
    searchForm: { display: 'flex', gap: '15px', marginBottom: '35px', background: '#fff', padding: '15px', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' },
    searchContainer: { flex: 1, display: 'flex', alignItems: 'center', background: '#f1f5f9', borderRadius: '8px', padding: '0 15px', border: '1px solid #e2e8f0' },
    searchIcon: { fontSize: '18px', marginRight: '10px' },
    searchInput: { width: '100%', border: 'none', background: 'transparent', padding: '12px 0', fontSize: '16px', outline: 'none', color: '#1e293b' },
    searchButton: { padding: '12px 30px', background: '#0284c7', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', transition: 'all 0.2s' },
    
    // গ্রিড লেআউট (২ কলাম)
    layoutGrid: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '25px', alignItems: 'start' },
    leftColumn: { display: 'flex', flexDirection: 'column', gap: '25px' },
    rightColumn: {},

    // কার্ড ডিজাইন
    card: { background: '#fff', borderRadius: '12px', padding: '24px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' },
    cardTitle: { fontSize: '18px', fontWeight: '600', color: '#1e293b', marginBottom: '20px', paddingBottom: '10px', borderBottom: '1px solid #f1f5f9' },
    
    // ইনপুট ফর্ম এলিমেন্টস
    inputGroup: { marginBottom: '16px', display: 'flex', flexDirection: 'column' },
    label: { fontSize: '13px', fontWeight: '600', color: '#475569', marginBottom: '6px' },
    input: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#334155', outline: 'none', transition: 'border 0.2s', background: '#fff' },
    selectInput: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#334155', outline: 'none', background: '#fff' },
    disabledInput: { padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', color: '#64748b', background: '#f8fafc', fontWeight: 'bold' },
    textarea: { padding: '10px 14px', border: '1px solid #cbd5e1', borderRadius: '8px', fontSize: '14px', color: '#334155', minHeight: '70px', outline: 'none', resize: 'vertical' },
    
    // সেলস রেকর্ড বক্স
    infoCard: { background: '#f0fdf4', borderColor: '#bbf7d0' },
    infoCardTitle: { fontSize: '15px', fontWeight: '700', color: '#166534', marginBottom: '12px' },
    infoRow: { display: 'flex', justifycontent: 'space-between', fontSize: '13px', color: '#14532d', padding: '6px 0', borderBottom: '1px dashed #dcfce7' },

    // সার্ভিস গ্রিড (৪টি কার্ডের সেট)
    serviceGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' },
    serviceCard: { background: '#fff', borderRadius: '12px', padding: '20px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)' },
    serviceHeader: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '15px' },
    serviceBadge: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '28px', height: '28px', borderRadius: '50%', background: '#ffedd5', color: '#ea580c', fontSize: '13px', fontWeight: '700' },
    serviceTitle: { fontSize: '15px', fontWeight: '600', color: '#1e293b' },

    // বাটন ও মেসেজ এলার্টস
    actionContainer: { marginTop: '30px', textAlign: 'right' },
    submitButton: { width: '100%', padding: '16px', background: '#ea580c', color: '#fff', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '16px', fontWeight: '600', boxShadow: '0 4px 6px -1px rgb(234 88 12 / 0.2)' },
    
    alert: { padding: '14px', borderRadius: '8px', marginBottom: '25px', fontSize: '14px', fontWeight: '500' },
    success: { background: '#dcfce7', color: '#155724', border: '1px solid #bbf7d0' },
    error: { background: '#fee2e2', color: '#721c24', border: '1px solid #fecaca' },
    info: { background: '#e0f2fe', color: '#0369a1', border: '1px solid #bae6fd' },
    warning: { background: '#fef3c7', color: '#856404', border: '1px solid #fde68a' }
};

export default ServiceManager;