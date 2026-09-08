// tools/handoffRedirect.js
// NeoAssist entry → standalone Clinical Handoff

export function render() {
  return `
    <section class="handoff-entry" data-tool="handoff">
      <style>
        .handoff-entry{
          --hf-ink:#292623;
          --hf-muted:#7d766f;
          --hf-line:#ddd6ce;
          --hf-accent:#4b4743;
          --hf-soft:#f7f2eb;

          min-height:520px;
          display:flex;
          align-items:center;
          justify-content:center;
          padding:48px 28px;
        }

        .handoff-entry-shell{
          width:min(780px,100%);
        }

        /* --------------------------------
           TOP LABEL
        -------------------------------- */

        .handoff-entry-eyebrow{
          display:flex;
          align-items:center;
          gap:9px;

          margin:0 0 12px 4px;

          color:#8b837b;
          font-size:10px;
          font-weight:700;
          letter-spacing:.14em;
          text-transform:uppercase;
        }

        .handoff-entry-eyebrow::before{
          content:"";
          width:22px;
          height:1px;
          background:#a9a097;
        }


        /* --------------------------------
           CARD
        -------------------------------- */

        .handoff-entry-card{
          position:relative;
          overflow:hidden;

          display:grid;
          grid-template-columns:minmax(0,1fr) 180px;

          min-height:280px;

          border:1px solid var(--hf-line);
          border-radius:14px;

          background:
            linear-gradient(
              135deg,
              #fff 0%,
              #fdfbf8 58%,
              #f5efe7 100%
            );

          box-shadow:
            0 1px 2px #3d332b0a,
            0 14px 40px #594b3f12;
        }


        /* --------------------------------
           MAIN
        -------------------------------- */

        .handoff-entry-main{
          position:relative;
          z-index:2;

          display:flex;
          flex-direction:column;
          justify-content:center;

          padding:42px 44px;
        }

        .handoff-entry-kicker{
          margin-bottom:9px;

          color:#8c847c;
          font-size:11px;
          font-weight:700;
          letter-spacing:.12em;
        }

        .handoff-entry-title{
          margin:0;

          color:var(--hf-ink);

          font-size:30px;
          font-weight:700;
          letter-spacing:-.025em;
          line-height:1.15;
        }

        .handoff-entry-subtitle{
          margin:10px 0 0;

          color:var(--hf-muted);

          font-size:13px;
          line-height:1.65;
        }


        /* --------------------------------
           FEATURES
        -------------------------------- */

        .handoff-entry-features{
          display:flex;
          flex-wrap:wrap;
          gap:7px;

          margin-top:22px;
        }

        .handoff-entry-feature{
          display:inline-flex;
          align-items:center;
          gap:6px;

          padding:5px 8px;

          border:1px solid #e4ddd5;
          border-radius:999px;

          background:#ffffffb8;

          color:#716a64;

          font-size:10px;
          font-weight:600;
        }

        .handoff-entry-feature::before{
          content:"";
          width:5px;
          height:5px;

          border-radius:50%;
          background:#8c9a89;
        }


        /* --------------------------------
           BUTTON
        -------------------------------- */

        .handoff-entry-actions{
          display:flex;
          align-items:center;
          gap:12px;

          margin-top:28px;
        }

        .handoff-entry-btn{
          position:relative;

          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:10px;

          height:42px;
          padding:0 17px;

          border:1px solid #3f3b38;
          border-radius:7px;

          background:#403c39;
          color:#fff;

          font-size:12px;
          font-weight:700;
          letter-spacing:.025em;

          box-shadow:
            0 1px 2px #0002,
            0 5px 14px #3d332b18;

          cursor:pointer;

          transition:
            transform .16s ease,
            background .16s ease,
            box-shadow .16s ease;
        }

        .handoff-entry-btn:hover{
          background:#302d2a;

          transform:translateY(-1px);

          box-shadow:
            0 2px 4px #0002,
            0 8px 18px #3d332b20;
        }

        .handoff-entry-btn:active{
          transform:translateY(0);
        }

        .handoff-entry-btn-arrow{
          display:inline-block;

          font-size:16px;
          font-weight:400;
          line-height:1;

          transition:transform .16s ease;
        }

        .handoff-entry-btn:hover .handoff-entry-btn-arrow{
          transform:translateX(3px);
        }

        .handoff-entry-note{
          color:#99918a;
          font-size:10px;
          line-height:1.4;
        }


        /* --------------------------------
           RIGHT VISUAL
        -------------------------------- */

        .handoff-entry-visual{
          position:relative;

          display:flex;
          align-items:center;
          justify-content:center;

          border-left:1px solid #e5ded6;

          background:
            linear-gradient(
              145deg,
              #f4eee7,
              #eee6dd
            );
        }

        .handoff-entry-paper{
          position:relative;

          width:102px;
          height:138px;

          padding:15px 12px;

          border:1px solid #d7cec4;
          border-radius:4px;

          background:#fff;

          box-shadow:
            0 12px 28px #51463d1c;

          transform:rotate(2.5deg);

          transition:
            transform .3s ease,
            box-shadow .3s ease;
        }

        .handoff-entry-card:hover .handoff-entry-paper{
          transform:
            rotate(0deg)
            translateY(-3px);

          box-shadow:
            0 17px 34px #51463d25;
        }

        .handoff-entry-paper-head{
          width:54px;
          height:6px;

          margin-bottom:12px;

          border-radius:2px;

          background:#514c48;
        }

        .handoff-entry-paper-line{
          height:3px;
          margin-bottom:7px;

          border-radius:2px;

          background:#ded8d1;
        }

        .handoff-entry-paper-line:nth-child(3){
          width:76%;
        }

        .handoff-entry-paper-line:nth-child(4){
          width:91%;
        }

        .handoff-entry-paper-line:nth-child(5){
          width:65%;
        }

        .handoff-entry-paper-section{
          width:30px;
          height:4px;

          margin:15px 0 8px;

          border-radius:2px;

          background:#8c847c;
        }

        .handoff-entry-status{
          position:absolute;

          right:17px;
          bottom:18px;

          display:flex;
          align-items:center;
          gap:6px;

          color:#7c756e;

          font-size:9px;
          font-weight:600;
        }

        .handoff-entry-status-dot{
          width:6px;
          height:6px;

          border-radius:50%;

          background:#829080;

          box-shadow:0 0 0 3px #82908018;
        }


        /* --------------------------------
           FOOTER
        -------------------------------- */

        .handoff-entry-footer{
          display:flex;
          justify-content:space-between;
          gap:16px;

          margin-top:12px;
          padding:0 4px;

          color:#a29a92;

          font-size:9px;
          letter-spacing:.02em;
        }


        /* --------------------------------
           RESPONSIVE
        -------------------------------- */

        @media(max-width:650px){

          .handoff-entry{
            min-height:440px;
            padding:28px 16px;
          }

          .handoff-entry-card{
            grid-template-columns:1fr;
          }

          .handoff-entry-main{
            padding:34px 28px;
          }

          .handoff-entry-title{
            font-size:26px;
          }

          .handoff-entry-visual{
            display:none;
          }

          .handoff-entry-actions{
            align-items:flex-start;
            flex-direction:column;
          }

          .handoff-entry-footer{
            display:none;
          }
        }
      </style>


      <div class="handoff-entry-shell">

        <div class="handoff-entry-eyebrow">
          Clinical workspace
        </div>


        <div class="handoff-entry-card">

          <div class="handoff-entry-main">

            <div class="handoff-entry-kicker">
              NEOASSIST
            </div>

            <h2 class="handoff-entry-title">
              Clinical Handoff System
            </h2>



            <div class="handoff-entry-features">

              <span class="handoff-entry-feature">
                Local storage
              </span>

              <span class="handoff-entry-feature">
                Autosave
              </span>

              <span class="handoff-entry-feature">
                Print friendly
              </span>
              
            </div>


            <div class="handoff-entry-actions">

              <button
                type="button"
                class="handoff-entry-btn"
                data-action="openHandoff"
              >
                開啟交班單

                <span class="handoff-entry-btn-arrow">
                  →
                </span>
              </button>


            </div>

          </div>


          <div class="handoff-entry-visual" aria-hidden="true">

            <div class="handoff-entry-paper">

              <div class="handoff-entry-paper-head"></div>

              <div class="handoff-entry-paper-line"></div>
              <div class="handoff-entry-paper-line"></div>
              <div class="handoff-entry-paper-line"></div>
              <div class="handoff-entry-paper-line"></div>

              <div class="handoff-entry-paper-section"></div>

              <div class="handoff-entry-paper-line"></div>
              <div class="handoff-entry-paper-line"></div>
              <div class="handoff-entry-paper-line"></div>

            </div>


            <div class="handoff-entry-status">

              <span class="handoff-entry-status-dot"></span>

              Local

            </div>

          </div>

        </div>


        <div class="handoff-entry-footer">

          <span>NeoAssist · Clinical Tools</span>

          <span>Patient-centric workspace</span>

        </div>

      </div>

    </section>
  `;
}


export function init(host = document) {

  const root =
    host?.matches?.('[data-tool="handoff"]')
      ? host
      : host?.querySelector?.('[data-tool="handoff"]');

  if (!root) return;


  root
    .querySelector('[data-action="openHandoff"]')
    ?.addEventListener("click", () => {

      window.location.href = "./handoff/";

    });
}


export function destroy() {}


export default {
  render,
  init,
  destroy
};
