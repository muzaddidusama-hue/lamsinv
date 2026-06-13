<script>
      window.alert = function(message) {
        let iconType = 'info';
        let titleText = 'বিজ্ঞপ্তি';

        const lowerMessage = message.toLowerCase();
        
        // 🔴 ফিক্স: 'সমস্যা' শব্দটিকে আগে Error হিসেবে চেক করবে
        if (lowerMessage.includes('ত্রুটি') || lowerMessage.includes('error') || lowerMessage.includes('দুঃখিত') || lowerMessage.includes('অবৈধ') || lowerMessage.includes('সমস্যা') || lowerMessage.includes('ভুল')) {
          iconType = 'error';
          titleText = 'এরর!';
        } else if (lowerMessage.includes('সফল') || lowerMessage.includes('✅') || lowerMessage.includes('সাকসেস') || lowerMessage.includes('সেভ')) {
          iconType = 'success';
          titleText = 'সফল হয়েছে!';
        } else if (lowerMessage.includes('ইতোমধ্যে') || lowerMessage.includes('বিদ্যমান') || lowerMessage.includes('🔒') || lowerMessage.includes('⚠️') || lowerMessage.includes('মাত্র')) {
          iconType = 'warning';
          titleText = 'সতর্কতা!';
        }

        Swal.fire({
          title: titleText,
          text: message,
          icon: iconType,
          confirmButtonText: 'ঠিক আছে',
          confirmButtonColor: '#2563eb', 
          customClass: {
            popup: 'rounded-[2rem] shadow-xl border border-slate-100'
          }
        });
      };
    </script>