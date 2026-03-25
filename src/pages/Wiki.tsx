import { useState } from 'react';
import {
  ChevronDown, ChevronRight, BookOpen, Car, DollarSign,
  CreditCard, PiggyBank, Wrench, ShoppingCart, Code, Shield,
  HelpCircle, Gauge, Server
} from 'lucide-react';

interface Section {
  id: string;
  title: string;
  icon: React.ReactNode;
  content: React.ReactNode;
}

function WikiSection({ section }: { section: Section }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-dark-800/50 transition-colors cursor-pointer"
      >
        <span className="text-primary-400">{section.icon}</span>
        <span className="flex-1 font-semibold text-dark-50">{section.title}</span>
        {open ? <ChevronDown size={20} className="text-dark-400" /> : <ChevronRight size={20} className="text-dark-400" />}
      </button>
      {open && (
        <div className="px-6 pb-6 border-t border-dark-800 pt-4">
          <div className="prose-dark space-y-4 text-dark-300 text-sm leading-relaxed">
            {section.content}
          </div>
        </div>
      )}
    </div>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold text-dark-100 mt-4 mb-2">{children}</h3>;
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="text-dark-300 leading-relaxed">{children}</p>;
}

function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside space-y-1 text-dark-300 ml-2">{children}</ul>;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-dark-800 border border-dark-700 rounded-lg p-4 overflow-x-auto text-xs">
      <code className="text-dark-200 font-mono">{children}</code>
    </pre>
  );
}

export default function Wiki() {
  const sections: Section[] = [
    {
      id: 'getting-started',
      title: 'Getting Started',
      icon: <BookOpen size={20} />,
      content: (
        <>
          <P>DriveLedger is your personal vehicle finance management tool. It helps you track all expenses, loans, savings, and repairs for your vehicles in one place.</P>
          <H3>First Steps</H3>
          <UL>
            <li>Start by adding your first vehicle on the <strong className="text-dark-100">Vehicles</strong> page</li>
            <li>Fill in vehicle details like brand, model, fuel type, and purchase price</li>
            <li>Add recurring costs (insurance, tax, fuel) on the <strong className="text-dark-100">Costs</strong> page</li>
            <li>Set up any loans or financing on the <strong className="text-dark-100">Loans</strong> page</li>
            <li>Create savings goals to plan for future repairs or your next car</li>
            <li>Track all repairs and maintenance work on the <strong className="text-dark-100">Repairs</strong> page</li>
          </UL>
          <H3>Dashboard</H3>
          <P>The Dashboard gives you an overview of all your vehicles, total monthly and yearly costs broken down by category and person, loan progress, and savings status. It is your central hub for understanding your vehicle finances at a glance.</P>
          <H3>Quick Setup Options</H3>
          <UL>
            <li><strong className="text-dark-100">Windows (dev.bat)</strong> - Double-click <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">dev.bat</code> to auto-install dependencies, create the .env file, and launch both backend and frontend in one step.</li>
            <li><strong className="text-dark-100">Docker (Production)</strong> - Use <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">docker compose up -d</code> for a single-command production deployment with persistent data and health checks.</li>
            <li><strong className="text-dark-100">update.sh (Maintenance)</strong> - On Linux servers, use <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">./update.sh update</code> to pull the latest code and rebuild, or <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">./update.sh reset</code> for a full wipe.</li>
          </UL>
          <P>See the <strong className="text-dark-100">Deployment</strong> section below for detailed instructions on each method.</P>
        </>
      ),
    },
    {
      id: 'vehicles',
      title: 'Vehicles',
      icon: <Car size={20} />,
      content: (
        <>
          <P>The Vehicles page lets you manage all your owned and planned vehicles.</P>
          <H3>Vehicle Fields</H3>
          <UL>
            <li><strong className="text-dark-100">Name</strong> - A friendly name for your vehicle (e.g., "Family SUV")</li>
            <li><strong className="text-dark-100">Brand &amp; Model</strong> - Manufacturer and model designation</li>
            <li><strong className="text-dark-100">Variant</strong> - Specific variant (e.g., "AMG-Line, 194 PS")</li>
            <li><strong className="text-dark-100">License Plate</strong> - Your vehicle's registration plate</li>
            <li><strong className="text-dark-100">HSN/TSN</strong> - German manufacturer/type codes for insurance</li>
            <li><strong className="text-dark-100">First Registration</strong> - Date of first registration</li>
            <li><strong className="text-dark-100">Purchase Price</strong> - What you paid for the vehicle</li>
            <li><strong className="text-dark-100">Mileage</strong> - Current and estimated annual mileage</li>
            <li><strong className="text-dark-100">Fuel Type</strong> - Diesel, Benzin, Elektro, Hybrid, or LPG</li>
            <li><strong className="text-dark-100">Consumption &amp; Fuel Price</strong> - Average l/100km and price per liter</li>
            <li><strong className="text-dark-100">Status</strong> - "Owned" for your current cars, "Planned" for future purchases</li>
            <li><strong className="text-dark-100">mobile.de Link</strong> - Link to the listing if applicable</li>
          </UL>
          <H3>Vehicle Detail View</H3>
          <P>Click on any vehicle to see a comprehensive detail view including all associated costs, loans, repairs, and savings goals. You can also view calculated monthly fuel costs and total cost of ownership.</P>
        </>
      ),
    },
    {
      id: 'costs',
      title: 'Costs',
      icon: <DollarSign size={20} />,
      content: (
        <>
          <P>Track all recurring and one-time costs associated with your vehicles.</P>
          <H3>Cost Categories</H3>
          <UL>
            <li><strong className="text-dark-100">Steuer</strong> - Vehicle tax (Kfz-Steuer)</li>
            <li><strong className="text-dark-100">Versicherung</strong> - Insurance (Haftpflicht, Teilkasko, Vollkasko)</li>
            <li><strong className="text-dark-100">Sprit</strong> - Fuel costs</li>
            <li><strong className="text-dark-100">Pflege</strong> - Car care and washing</li>
            <li><strong className="text-dark-100">Reparatur</strong> - Repairs</li>
            <li><strong className="text-dark-100">TUeV</strong> - Vehicle inspection</li>
            <li><strong className="text-dark-100">Finanzierung</strong> - Financing related costs</li>
            <li><strong className="text-dark-100">Sparen</strong> - Savings contributions</li>
            <li><strong className="text-dark-100">Sonstiges</strong> - Other costs</li>
          </UL>
          <H3>Frequencies</H3>
          <P>Costs can be set as: monthly (monatlich), quarterly (quartal), semi-annual (halbjaehrlich), annual (jaehrlich), or one-time (einmalig). All costs are automatically converted to monthly and yearly totals for the dashboard.</P>
          <H3>Paid By</H3>
          <P>Assign each cost to a person to see the breakdown of who pays what. Manage persons on the Vehicles page or they are created automatically when you add costs.</P>
        </>
      ),
    },
    {
      id: 'loans',
      title: 'Loans & Financing',
      icon: <CreditCard size={20} />,
      content: (
        <>
          <P>Track loans, financing agreements, and payment schedules for your vehicles.</P>
          <H3>Loan Fields</H3>
          <UL>
            <li><strong className="text-dark-100">Total Amount</strong> - The original loan amount</li>
            <li><strong className="text-dark-100">Monthly Payment</strong> - Regular monthly payment</li>
            <li><strong className="text-dark-100">Interest Rate</strong> - Annual interest rate (0 for interest-free loans)</li>
            <li><strong className="text-dark-100">Start Date</strong> - When payments began</li>
            <li><strong className="text-dark-100">Duration</strong> - Number of months for the loan</li>
            <li><strong className="text-dark-100">Additional Savings</strong> - Extra monthly amount saved alongside loan payments</li>
          </UL>
          <H3>Progress Tracking</H3>
          <P>The dashboard and loan page show how much of the loan has been paid off, remaining balance, estimated payoff date, and amortization progress.</P>
        </>
      ),
    },
    {
      id: 'savings',
      title: 'Savings',
      icon: <PiggyBank size={20} />,
      content: (
        <>
          <P>Set savings goals and track transactions toward those goals.</P>
          <H3>Savings Goals</H3>
          <P>Create goals like "Repair Reserve" or "Next Car Fund" with a target amount and monthly contribution. The system tracks your progress and projects when you will reach your goal.</P>
          <H3>Transactions</H3>
          <P>Record deposits and withdrawals against your savings goals. Each transaction has a date, amount, type (deposit/withdrawal), and description.</P>
          <H3>Projections</H3>
          <P>Based on your monthly contribution and current balance, DriveLedger calculates the estimated date when you will reach your savings goal.</P>
        </>
      ),
    },
    {
      id: 'repairs',
      title: 'Repairs',
      icon: <Wrench size={20} />,
      content: (
        <>
          <P>Keep a complete history of all repairs and maintenance work on your vehicles.</P>
          <H3>Repair Fields</H3>
          <UL>
            <li><strong className="text-dark-100">Date</strong> - When the repair was performed</li>
            <li><strong className="text-dark-100">Description</strong> - What was done</li>
            <li><strong className="text-dark-100">Category</strong> - Type of repair (Service, Brakes, Engine, etc.)</li>
            <li><strong className="text-dark-100">Cost</strong> - Total cost of the repair</li>
            <li><strong className="text-dark-100">Mileage</strong> - Odometer reading at time of repair</li>
            <li><strong className="text-dark-100">Workshop</strong> - Where the work was done</li>
          </UL>
          <P>Having a detailed repair history helps you plan future maintenance, estimate ongoing costs, and increases the resale value of your vehicle.</P>
        </>
      ),
    },
    {
      id: 'purchase-planner',
      title: 'Purchase Planner',
      icon: <ShoppingCart size={20} />,
      content: (
        <>
          <P>Compare potential vehicle purchases side by side to make informed buying decisions.</P>
          <H3>Features</H3>
          <UL>
            <li>Add multiple vehicles you are considering</li>
            <li>Enter estimated costs (insurance, tax, fuel, maintenance)</li>
            <li>Configure financing options (down payment, term, interest rate)</li>
            <li>Calculate total monthly cost of ownership for each option</li>
            <li>Add pros/cons and a rating for each vehicle</li>
            <li>Link to mobile.de listings for reference</li>
          </UL>
          <H3>Financing Calculator</H3>
          <P>Enter the vehicle price, your down payment, financing term in months, and interest rate. The calculator shows you the monthly payment and total cost of financing.</P>
        </>
      ),
    },
    {
      id: 'deployment',
      title: 'Deployment',
      icon: <Server size={20} />,
      content: (
        <>
          <P>DriveLedger can be run in development mode on Windows or deployed to production with Docker.</P>

          <H3>Windows Development (dev.bat)</H3>
          <P>The included <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">dev.bat</code> script is the easiest way to get started on Windows:</P>
          <UL>
            <li>Double-click <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">dev.bat</code> or run it from a terminal</li>
            <li>It checks that Node.js is installed</li>
            <li>Automatically runs <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">npm install</code> if <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">node_modules</code> is missing</li>
            <li>Creates <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">.env</code> from <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">.env.example</code> if it does not exist</li>
            <li>Starts both the backend (Express) and frontend (Vite) concurrently</li>
          </UL>
          <CodeBlock>{`# Just double-click dev.bat, or from a terminal:
dev.bat`}</CodeBlock>

          <H3>Docker Production Setup</H3>
          <P>For production, DriveLedger ships with a multi-stage Dockerfile and Docker Compose configuration:</P>
          <UL>
            <li>Multi-stage build keeps the final image small (only runtime dependencies)</li>
            <li>Runs as a non-root user for security</li>
            <li>Persistent volume for the SQLite database</li>
            <li>Built-in health checks</li>
            <li>Single-port deployment: Express serves both the frontend and API</li>
          </UL>
          <CodeBlock>{`# Start in production mode:
docker compose up -d

# View logs:
docker compose logs -f

# Stop:
docker compose down`}</CodeBlock>

          <H3>Nginx Reverse Proxy</H3>
          <P>For HTTPS and domain-based access, place Nginx in front of the Docker container:</P>
          <CodeBlock>{`server {
    listen 443 ssl;
    server_name drive.example.com;

    ssl_certificate     /etc/letsencrypt/live/drive.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drive.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}`}</CodeBlock>

          <H3>update.sh (Linux Maintenance)</H3>
          <P>The <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">update.sh</code> script manages your Docker deployment on Linux servers:</P>
          <UL>
            <li><strong className="text-dark-100">update</strong> - Pulls latest code, rebuilds the Docker image, and restarts. Your database and data are preserved.</li>
            <li><strong className="text-dark-100">reset</strong> - Full factory reset: stops containers, removes volumes and images, and redeploys from scratch. Requires triple confirmation for safety.</li>
          </UL>
          <CodeBlock>{`# Update to latest version (preserves data):
./update.sh update

# Full reset (destroys all data!):
./update.sh reset`}</CodeBlock>

          <H3>Environment Variables</H3>
          <P>Configure DriveLedger via the <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">.env</code> file. Key variables:</P>
          <UL>
            <li><strong className="text-dark-100">PORT</strong> - Server port (default: 3000)</li>
            <li><strong className="text-dark-100">JWT_SECRET</strong> - Secret key for signing JWT tokens (required, use a long random string)</li>
            <li><strong className="text-dark-100">ADMIN_EMAIL / ADMIN_PASSWORD</strong> - Auto-created admin account on first startup</li>
            <li><strong className="text-dark-100">FRONTEND_URL</strong> - The URL where the frontend is accessible (used for CORS)</li>
            <li><strong className="text-dark-100">SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS</strong> - Email server for password resets and notifications</li>
            <li><strong className="text-dark-100">SMTP_FROM</strong> - Sender address for outgoing emails</li>
          </UL>
          <P>Copy <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">.env.example</code> to <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">.env</code> and fill in your values. The dev.bat script does this automatically.</P>
        </>
      ),
    },
    {
      id: 'api',
      title: 'API',
      icon: <Code size={20} />,
      content: (
        <>
          <P>DriveLedger provides a RESTful API for programmatic access to your data. Two authentication methods are supported.</P>
          <H3>Authentication Methods</H3>
          <P><strong className="text-dark-100">1. JWT (Browser Sessions)</strong> - Used automatically by the web UI. Access tokens expire after 15 minutes; refresh tokens (httpOnly cookies) last 7 days.</P>
          <P><strong className="text-dark-100">2. API Key (Programmatic Access)</strong> - For scripts, automations, and third-party integrations. Create a token in Settings &gt; API Tokens. Each token has a visible prefix and a secret. Use the secret in the Authorization header:</P>
          <CodeBlock>{`curl -H "Authorization: Bearer YOUR_TOKEN_SECRET" \\
  https://your-domain.com/api/vehicles`}</CodeBlock>
          <H3>Creating API Tokens</H3>
          <UL>
            <li>Go to <strong className="text-dark-100">Settings &gt; API Tokens</strong> and click "Create Token"</li>
            <li>Give the token a descriptive name (e.g., "Backup Script")</li>
            <li>Copy the secret immediately - it is only shown once</li>
            <li>Tokens can be activated/deactivated or revoked at any time</li>
            <li>Last usage time is tracked for auditing</li>
          </UL>
          <H3>Endpoint Groups</H3>
          <UL>
            <li><strong className="text-dark-100">Auth</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/auth/*</code> - Login, register, refresh, change password, delete account</li>
            <li><strong className="text-dark-100">Vehicles</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/vehicles</code> - Full CRUD for owned and planned vehicles</li>
            <li><strong className="text-dark-100">Costs</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/costs</code> - Recurring and one-time cost tracking</li>
            <li><strong className="text-dark-100">Loans</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/loans</code> - Loan and financing management</li>
            <li><strong className="text-dark-100">Repairs</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/repairs</code> - Repair history records</li>
            <li><strong className="text-dark-100">Savings Goals</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/savings-goals</code> - Goals with target amounts</li>
            <li><strong className="text-dark-100">Savings Transactions</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/savings-transactions</code> - Deposits and withdrawals</li>
            <li><strong className="text-dark-100">Planned Purchases</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/planned-purchases</code> - Vehicle purchase planning</li>
            <li><strong className="text-dark-100">Persons</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/persons</code> - Cost-split person management</li>
            <li><strong className="text-dark-100">Data</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/data/export</code>, <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/data/import</code> - Full data export/import</li>
            <li><strong className="text-dark-100">API Tokens</strong> - <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">/api/api-tokens</code> - Token management (create, list, toggle, revoke)</li>
          </UL>
          <P>Each resource group supports the standard CRUD operations: GET (list/detail), POST (create), PUT (update), DELETE (remove).</P>
          <H3>Example: Create a Vehicle</H3>
          <CodeBlock>{`curl -X POST https://your-domain.com/api/vehicles \\
  -H "Authorization: Bearer YOUR_TOKEN_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "My Car",
    "brand": "BMW",
    "model": "320d",
    "fuelType": "diesel",
    "purchasePrice": 25000
  }'`}</CodeBlock>
          <H3>Example: Export All Data</H3>
          <CodeBlock>{`curl -H "Authorization: Bearer YOUR_TOKEN_SECRET" \\
  https://your-domain.com/api/data/export -o backup.json`}</CodeBlock>
          <H3>Example: Change Password</H3>
          <CodeBlock>{`curl -X POST https://your-domain.com/api/auth/change-password \\
  -H "Authorization: Bearer YOUR_TOKEN_SECRET" \\
  -H "Content-Type: application/json" \\
  -d '{ "currentPassword": "old", "newPassword": "new" }'`}</CodeBlock>
          <H3>Error Handling</H3>
          <P>Errors return JSON with an <code className="bg-dark-800 px-1.5 py-0.5 rounded text-dark-200">error</code> field. Common status codes: 400 (bad request), 401 (unauthorized), 404 (not found), 429 (rate limited), 500 (server error). Auth endpoints are rate-limited to 5 requests/minute; all other endpoints allow 100 requests/minute.</P>
        </>
      ),
    },
    {
      id: 'security',
      title: 'Security',
      icon: <Shield size={20} />,
      content: (
        <>
          <P>DriveLedger takes security seriously. Here is how your data is protected:</P>
          <H3>Authentication</H3>
          <UL>
            <li>Passwords are hashed with bcrypt (never stored in plain text)</li>
            <li>JWT access tokens expire after 15 minutes</li>
            <li>Refresh tokens are stored as HTTP-only secure cookies</li>
            <li>All API requests require authentication</li>
          </UL>
          <H3>Invite-Only Registration</H3>
          <P>New accounts require a registration token generated by an admin. This prevents unauthorized sign-ups and keeps your instance private.</P>
          <H3>API Tokens</H3>
          <UL>
            <li>API tokens have a visible prefix and a hashed secret</li>
            <li>Tokens can be activated/deactivated without deletion</li>
            <li>Last usage timestamp is tracked for auditing</li>
            <li>Tokens can be scoped with permissions (read, write)</li>
          </UL>
          <H3>Best Practices</H3>
          <UL>
            <li>Use a strong, unique password (min. 8 chars with uppercase, lowercase, and numbers)</li>
            <li>Rotate API tokens periodically</li>
            <li>Deactivate tokens you are not actively using</li>
            <li>Export your data regularly as a backup</li>
          </UL>
        </>
      ),
    },
    {
      id: 'faq',
      title: 'FAQ',
      icon: <HelpCircle size={20} />,
      content: (
        <>
          <H3>How do I get a registration token?</H3>
          <P>Registration tokens are generated by administrators. If you need an account, ask the person who manages the DriveLedger instance for an invite token.</P>
          <H3>Can I share data between users?</H3>
          <P>Currently, each user has their own separate data. Sharing features may be added in a future version.</P>
          <H3>What happens if I forget my password?</H3>
          <P>Use the "Forgot password?" link on the login page. A reset link will be sent to your email (if email is configured on the server).</P>
          <H3>How do I change my password?</H3>
          <P>Go to Settings &gt; Profile &gt; Change Password. You need to enter your current password for verification.</P>
          <H3>Can I export my data?</H3>
          <P>Yes. Go to Settings &gt; Data &gt; Export JSON. This downloads all your vehicles, costs, loans, repairs, savings, and other data as a JSON file.</P>
          <H3>How do I delete my account?</H3>
          <P>Go to Settings &gt; Data &gt; Delete Account. You will need to confirm three times to prevent accidental deletion. This action is irreversible.</P>
          <H3>What currency does DriveLedger use?</H3>
          <P>All monetary values are in Euros. Currency customization may be added in a future version.</P>
          <H3>Can I track multiple vehicles?</H3>
          <P>Yes. You can add as many vehicles as you want and track costs, loans, repairs, and savings separately for each one.</P>
        </>
      ),
    },
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary-600/20 mb-4">
          <Gauge size={28} className="text-primary-400" />
        </div>
        <h1 className="text-2xl font-bold text-dark-50">DriveLedger Documentation</h1>
        <p className="text-dark-400 mt-1">Everything you need to know about using DriveLedger</p>
      </div>

      {/* Sections */}
      <div className="space-y-3">
        {sections.map((section) => (
          <WikiSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
