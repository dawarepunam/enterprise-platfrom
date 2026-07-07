window.init_analytics = async function() {
  try {
    const stats = await ProductAPI.getDashboardStats();
    const requirements = await ProductAPI.getQueue();

    // Stats
    let totalFeatures = 0;
    let totalHours = 0;
    let totalResources = 0;
    
    // Aggregate budget by category
    const budgetMap = {};
    const riskMap = {};

    requirements.forEach(req => {
      // Timeline & Resources
      if(req.features) {
        totalFeatures += req.features.length;
        req.features.forEach(f => totalHours += (f.estimatedHours || 0));
      }
      if(req.resources) {
        totalResources += req.resources.length;
      }

      // Budget
      if(req.budgetItems) {
        req.budgetItems.forEach(b => {
          budgetMap[b.category] = (budgetMap[b.category] || 0) + (b.estimatedCost || 0);
        });
      }

      // Risks
      if(req.risks) {
        req.risks.forEach(r => {
          riskMap[r.type] = (riskMap[r.type] || 0) + 1;
        });
      }
    });

    document.getElementById('statTotalFeatures').innerText = totalFeatures;
    document.getElementById('statTotalHours').innerText = totalHours;
    document.getElementById('statTotalResources').innerText = totalResources;

    // Render Budget Chart
    const budgetContainer = document.getElementById('budgetChartContainer');
    budgetContainer.innerHTML = '';
    const maxBudget = Math.max(...Object.values(budgetMap), 1000);
    Object.keys(budgetMap).forEach(category => {
      const val = budgetMap[category];
      const pct = Math.max((val / maxBudget) * 100, 5);
      budgetContainer.innerHTML += `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height: 0%;" data-height="${pct}%" title="${category}: ${window.UI.formatCurrency(val)}"></div>
          <div class="chart-label" title="${category}">${category}</div>
        </div>
      `;
    });

    // Render Risk Chart
    const riskContainer = document.getElementById('riskChartContainer');
    riskContainer.innerHTML = '';
    const maxRisk = Math.max(...Object.values(riskMap), 5);
    Object.keys(riskMap).forEach(type => {
      const val = riskMap[type];
      const pct = Math.max((val / maxRisk) * 100, 5);
      riskContainer.innerHTML += `
        <div class="chart-bar-wrapper">
          <div class="chart-bar" style="height: 0%; background-color: var(--pm-danger);" data-height="${pct}%" title="${type}: ${val} Risks"></div>
          <div class="chart-label" title="${type}">${type}</div>
        </div>
      `;
    });

    // Animate bars
    setTimeout(() => {
      document.querySelectorAll('.chart-bar').forEach(bar => {
        bar.style.height = bar.dataset.height;
      });
    }, 100);

  } catch (error) {
    console.error('Error loading analytics:', error);
    window.UI.toast('Failed to load analytics data', 'error');
  }
};

window.action_analytics = function(action, id, target) {
  if (action === 'exportPDF' || action === 'exportExcel') {
    window.UI.toast('Exporting report...', 'info');
    setTimeout(() => window.UI.toast('Report downloaded successfully.', 'success'), 1500);
  } else if (action === 'drilldown') {
    window.UI.openDrawer('Analytics Drilldown', 'Detailed Metrics', `
      <div style="padding: 1rem;">
        <p>This is a drilldown view for ${id} generated from MongoDB aggregation pipelines.</p>
        <button class="pm-btn pm-btn-secondary" onclick="window.UI.closeDrawer()" style="margin-top:2rem;">Close</button>
      </div>
    `);
  }
};
