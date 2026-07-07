document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('benefitsContainer');

  async function fetchBenefits() {
    try {
      const res = await fetch('/api/claims-benefits/benefits');
      const benefits = await res.json();
      renderBenefits(benefits);
    } catch (err) {
      console.error('Error fetching benefits:', err);
    }
  }

  function renderBenefits(benefits) {
    if (!benefits || benefits.length === 0) {
      container.innerHTML = '<h2>Company Benefits</h2><p>No active benefits assigned to your profile.</p>';
      return;
    }

    // Usually benefits is an array where one object has the employee's benefits
    const userBenefits = benefits[0]; // Simplified for demo
    
    let html = '<h2>Company Benefits</h2>';
    
    if (userBenefits.healthInsurance) {
      html += \`
        <div class="benefit-card">
          <div class="benefit-icon"><i class="fas fa-heartbeat"></i></div>
          <div class="benefit-details" style="flex:1;">
            <h4>Health Insurance (\${userBenefits.healthInsurance.provider})</h4>
            <p>Coverage: $\${userBenefits.healthInsurance.coverageAmount} | Policy: \${userBenefits.healthInsurance.policyNumber}</p>
          </div>
          <div class="action-btns" style="opacity:1;">
            <button class="btn btn-primary" onclick="showToast('Policy Downloaded', 'success')"><i class="fas fa-download"></i> Download Policy</button>
          </div>
        </div>
      \`;
    }

    if (userBenefits.pfDetails) {
      html += \`
        <div class="benefit-card">
          <div class="benefit-icon"><i class="fas fa-piggy-bank"></i></div>
          <div class="benefit-details" style="flex:1;">
            <h4>Provident Fund (PF)</h4>
            <p>UAN: \${userBenefits.pfDetails.uan} | PF: \${userBenefits.pfDetails.pfNumber}</p>
          </div>
          <div class="action-btns" style="opacity:1;">
            <button class="btn" style="border:1px solid var(--border-color);"><i class="fas fa-external-link-alt"></i> Portal</button>
          </div>
        </div>
      \`;
    }
    
    if (userBenefits.perks && userBenefits.perks.length > 0) {
      userBenefits.perks.forEach(perk => {
        html += \`
          <div class="benefit-card">
            <div class="benefit-icon"><i class="fas fa-star"></i></div>
            <div class="benefit-details" style="flex:1;">
              <h4>\${perk}</h4>
              <p>Active Standard Perk</p>
            </div>
            <div class="action-btns" style="opacity:1;">
              <span class="status-badge status-success">Active</span>
            </div>
          </div>
        \`;
      });
    }

    container.innerHTML = html;
  }

  fetchBenefits();
});
