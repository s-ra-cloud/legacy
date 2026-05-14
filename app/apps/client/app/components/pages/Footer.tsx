import { Link } from "react-router";
import { SAFE_ROUTES } from "~/safe-routes";

export default function Footer() {
  return (
    <footer className="bg-[#0E0D14] text-white py-8 px-4 my-auto">
      <div className="flex flex-col md:flex-row justify-between items-center mx-10">
        <div className="mb-6 md:mb-0 flex flex-col"
        style={{
          fontWeight: 300,
      }}>
          <span
            className="text-legacy-silver hover:text-white"
          >
            Contact: contact@legacyprojects.io
          </span>
          <a 
            href="https://fos-network.gitbook.io/eep" 
            className="text-legacy-silver hover:text-white" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            FAQ
          </a>
          <a 
            href="https://fos-network.gitbook.io/eep/legacy-legal" 
            className="text-legacy-silver hover:text-white" 
            target="_blank" 
            rel="noopener noreferrer"
          >
            Legal & privacy
          </a>
        </div>

        <div className="mb-6 md:mb-0">
          <div className="flex items-center justify-center">
            <Link to={SAFE_ROUTES.HOME}>
              <img
                src="/images/legacy.svg"
                alt="LEGACY Logo"
                width={70}
                height={70}
              />
            </Link>
          </div>
        </div>

        <div className="text-right font-serif"
        style={{
          fontFamily: 'Didot, serif',
          fontWeight: 400,
          fontSize: '20px',
        }}>
          <p>© 2025 LEGACY.</p>
          <p>Released under the GNU Lesser<br></br> General Public License (LGPL) v3.</p>
          <p>
            View the source code on{" "}
            <Link
              to="https://github.com"
              className="text-blue-400 hover:underline"
            >
              GitHub
            </Link>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
