// import React from 'react';
// import { Link } from 'react-router-dom';
// import './RoleSelection.css';

// function RoleSelection() {
//   return (
//     <div className="role-selection-container">
//       <header className="role-header">
//         <h1>ChatGuard</h1>
//         <p>Please select your role to continue</p>
//       </header>
      
//       <div className="role-options-wrapper">
        
//         {/* Student Option */}
//         <Link to="/login" className="role-card student-card">
//           <div className="icon-wrapper">
//             <span className="role-icon">🎓</span>
//           </div>
//           <h2>Student</h2>
//           <p>Login to chat with peers</p>
//           <span className="arrow-icon">→</span>
//         </Link>
        
//         {/* Admin Option */}
//         <Link to="/admin-login" className="role-card admin-card">
//           <div className="icon-wrapper">
//             <span className="role-icon">🛡️</span>
//           </div>
//           <h2>Parent / Admin</h2>
//           <p>Monitor activity and alerts</p>
//           <span className="arrow-icon">→</span>
//         </Link>
        
//       </div>

//       <footer className="role-footer">
//         <p>© 2025 ChatGuard. Ensuring safe digital spaces.</p>
//       </footer>
//     </div>
//   );
// }

// export default RoleSelection;
import React from 'react';
import { Link } from 'react-router-dom';
import './RoleSelection.css';

function RoleSelection() {
  return (
    <div className="role-selection-container">
      <header className="role-header">
        <h1>ChatGuard</h1>
        <p>Please select your role to continue</p>
      </header>
      
      <div className="role-options-wrapper">
        
        {/* Student Option */}
        <Link to="/login" className="role-card student-card">
          <div className="icon-wrapper">
            <span className="role-icon">🎓</span>
          </div>
          <h2>Student</h2>
          <p>Login to chat with peers</p>
          <span className="arrow-icon">→</span>
        </Link>
        
        {/* Admin Option */}
        <Link to="/admin-login" className="role-card admin-card">
          <div className="icon-wrapper">
            <span className="role-icon">🛡️</span>
          </div>
          <h2>Parent / Admin</h2>
          <p>Monitor activity and alerts</p>
          <span className="arrow-icon">→</span>
        </Link>
        
      </div>

      <footer className="role-footer">
        <p>© 2025 ChatGuard. Ensuring safe digital spaces.</p>
      </footer>
    </div>
  );
}

export default RoleSelection;