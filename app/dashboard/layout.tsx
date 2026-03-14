import type { Metadata } from "next";
import Sidebar from "@/components/dashboard/Sidebar";
import Header from "@/components/dashboard/Header";

export const metadata: Metadata = {
  title: "Dashboard — Africa Samurai",
  description: "Boss Dashboard Africa Samurai - Kazier",
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Serif+Display:ital@0;1&display=swap"
        rel="stylesheet"
      />
      <div
        style={{
          display: "flex",
          height: "100vh",
          overflow: "hidden",
          background: "#F5F2ED",
          fontFamily: "'DM Sans', sans-serif",
        }}
      >
        <Sidebar />

        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            minWidth: 0,
          }}
        >
          <Header />
          <main 
            className="dashboard-main" 
            style={{ 
              flex: 1, 
              overflowY: "auto", 
              padding: "28px 32px",
            }}
          >
            {children}
          </main>
        </div>
      </div>

      <style>{`
        *, *::before, *::after { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0; 
        }
        
        a { text-decoration: none; }
        button { font-family: 'DM Sans', sans-serif; }

        /* Scrollbar */
        .dashboard-main::-webkit-scrollbar { 
          width: 4px; 
        }
        .dashboard-main::-webkit-scrollbar-thumb { 
          background: rgba(107,26,42,0.15); 
          border-radius: 99px; 
        }

        /* ── KPI Grids ── */
        .kpi-grid-4 {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        
        .kpi-grid-3 {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }

        /* ── Bottom grid ── */
        .bottom-grid {
          display: grid;
          grid-template-columns: 1fr 320px;
          gap: 16px;
        }

        /* ── Desktop large ── */
        @media (min-width: 1440px) {
          .dashboard-main {
            padding: 32px 40px !important;
          }
        }

        /* ── Desktop standard ── */
        @media (max-width: 1280px) {
          .dashboard-main {
            padding: 24px 28px !important;
          }
        }

        /* ── Tablet landscape ≤ 1024px ── */
        @media (max-width: 1024px) {
          .dashboard-main { 
            padding: 20px 24px !important; 
          }
          .kpi-grid-4 { 
            grid-template-columns: repeat(2, 1fr); 
          }
          .kpi-grid-3 { 
            grid-template-columns: repeat(2, 1fr); 
          }
          .bottom-grid { 
            grid-template-columns: 1fr; 
          }
        }

        /* ── Tablet portrait ≤ 768px ── */
        @media (max-width: 768px) {
          .dashboard-main {
            padding: 16px 20px !important;
            /* Plus besoin de padding-top car le bouton est géré dans le Sidebar */
          }
          
          .kpi-grid-4 { 
            grid-template-columns: repeat(2, 1fr); 
            gap: 12px; 
          }
          
          .kpi-grid-3 { 
            grid-template-columns: repeat(2, 1fr); 
            gap: 12px; 
          }
          
          .bottom-grid { 
            grid-template-columns: 1fr; 
            gap: 12px; 
          }

          /* Ajustement pour le header mobile */
          .dashboard-main {
            margin-top: 0;
          }
        }

        /* ── Petit mobile ≤ 640px ── */
        @media (max-width: 640px) {
          .dashboard-main {
            padding: 14px 16px !important;
          }
          
          .kpi-grid-4 { 
            grid-template-columns: 1fr; 
            gap: 10px;
          }
          
          .kpi-grid-3 { 
            grid-template-columns: 1fr; 
            gap: 10px;
          }
          
          .bottom-grid { 
            gap: 10px; 
          }
        }

        /* ── Très petit mobile ≤ 380px ── */
        @media (max-width: 380px) {
          .dashboard-main {
            padding: 12px 12px !important;
          }
        }

        /* Animation pour l'ouverture/fermeture du sidebar sur mobile */
        @keyframes slideIn {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        /* Classes utilitaires pour les animations */
        .sidebar-open {
          animation: slideIn 0.25s ease forwards;
        }

        .overlay-show {
          animation: fadeIn 0.25s ease forwards;
        }
      `}</style>
    </>
  );
}