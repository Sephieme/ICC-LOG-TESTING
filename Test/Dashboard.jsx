import React, { useState, useEffect } from 'react';
import 'dashboard.css'; // Ensure your CSS is in the same folder

const Dashboard = () => {
  const [inventory, setInventory] = useState([]);
  const [filterStatus, setFilterStatus] = useState("All");

  // Fetch data from your Python backend
  useEffect(() => {
    fetch('http://127.0.0.1:5000/inventory')
      .then(res => res.json())
      .then(data => setInventory(data))
      .catch(err => console.error("Error fetching ICC data:", err));
  }, []);

  // Calculate Stats
  const stats = {
    total: inventory.length,
    available: inventory.filter(i => i.status === "Available").length,
    borrowed: inventory.filter(i => i.status === "Borrowed").length,
    outOfStock: inventory.filter(i => i.status === "Out-of-Stock" || i.quantity === 0).length,
    maintenance: inventory.filter(i => i.status === "Maintenance").length,
    lost: inventory.filter(i => i.status === "Lost").length
  };

  const getPercent = (count) => stats.total > 0 ? ((count / stats.total) * 100).toFixed(1) : 0;

  // Filtered list for the bottom table
  const filteredItems = inventory
    .filter(i => filterStatus === "All" ? true : i.status === filterStatus)
    .slice(0, 5);

  return (
    <div className="container">
      <aside className="sidebar">
        <div className="logo">
          <img src="/Logo.png" alt="ICC Logo" className="logo-img" />
          <div className="icon">
            <h2>Industrial</h2>
            <h2>Controls</h2>
            <h2>Corporation</h2>
          </div>
        </div>
        <ul>
          <li className="active">Dashboard</li>
          <li><a href="/inventory" className="Design">Inventory</a></li>
          <li><a href="/borrowed" className="Design">Borrowed</a></li>
          <li><a href="/logs" className="Design">Audit Logs</a></li>
          <li><a href="/users" className="Design">Users</a></li>
          <li onClick={() => window.location.reload()}>Logout</li>
        </ul>
      </aside>

      <main className="main-content">
        <section id="dashboard" className="section active">
          <h1>Dashboard</h1>
          <div className="Dashboard1">
            <section className="stats-grid">
              <div className="stat-card">
                <div><p>Total Items</p><h3>{stats.total}</h3></div>
                <i className="fas fa-warehouse stat-icon"></i>
              </div>
              <div className="stat-card">
                <div><p>Available Items</p><h3>{stats.available}</h3></div>
                <i className="fas fa-check-square stat-icon"></i>
              </div>
              <div className="stat-card">
                <div><p>Borrowed Items</p><h3>{stats.borrowed}</h3></div>
                <i className="fas fa-hand-paper stat-icon"></i>
              </div>
              <div className="stat-card">
                <div><p>Out-of-Stock</p><h3>{stats.outOfStock}</h3></div>
                <i className="fas fa-history stat-icon"></i>
              </div>
            </section>

            <div className="middle-section">
              <div className="card inventory-overview">
                <div className="card-header">Inventory Overview</div>
                <table className="Stats">
                  <thead>
                    <tr><th>Status</th><th>Total</th><th>Percentage(%)</th></tr>
                  </thead>
                  <tbody>
                    <tr><td className="status-available">Available</td><td>{stats.available}</td><td>{getPercent(stats.available)}%</td></tr>
                    <tr><td className="status-borrowed">Borrowed</td><td>{stats.borrowed}</td><td>{getPercent(stats.borrowed)}%</td></tr>
                    <tr><td className="status-maintenance">Maintenance</td><td>{stats.maintenance}</td><td>{getPercent(stats.maintenance)}%</td></tr>
                    <tr><td className="status-out">Out-of-Stock</td><td>{stats.outOfStock}</td><td>{getPercent(stats.outOfStock)}%</td></tr>
                    <tr><td className="status-lost">Lost</td><td>{stats.lost}</td><td>{getPercent(stats.lost)}%</td></tr>
                  </tbody>
                </table>
              </div>

              <div className="card recent-activity">
                <div className="card-header">Recent Activity <button className="btn-view">View All</button></div>
                <div className="empty-list" style={{padding: '20px', textAlign: 'center', color: '#888'}}>No recent activity</div>
              </div>
            </div>

            <div className="card status-table-card">
              <div className="card-header">
                Inventory Item Status
                <select 
                  id="statusSelect" 
                  className="btn-status" 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="All">All Status</option>
                  <option value="Available">Available</option>
                  <option value="Borrowed">Borrowed</option>
                  <option value="Maintenance">Maintenance</option>
                </select>
              </div>
              <table>
                <thead>
                  <tr><th>Item Name</th><th>Category</th><th>Quantity</th></tr>
                </thead>
                <tbody>
                  {filteredItems.length > 0 ? filteredItems.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.item_name}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity || 1}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan="3" style={{textAlign: 'center'}}>No items found</td></tr>
                  )}
                </tbody>
              </table>
              <div className="card-footer">
                <a href="/inventory">View All →</a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;