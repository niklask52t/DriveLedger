import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronDown, BookOpen, Car, CreditCard, Wrench, PiggyBank,
  Bell, ShoppingCart, Users, Settings, Shield, Code, History,
  Fuel, Gauge, ClipboardCheck, Receipt, Package, Boxes,
  KanbanSquare, Share2, Search, FileText, Tag, Webhook,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { APP_VERSION } from '../lib/version';

interface Section {
  id: string;
  icon: typeof BookOpen;
  title: string;
  content: React.ReactNode;
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="bg-zinc-950 border border-zinc-800 rounded-lg p-4 font-mono text-xs text-zinc-300 overflow-x-auto">
      {children}
    </pre>
  );
}

const SECTIONS: Section[] = [
  {
    id: 'getting-started',
    icon: BookOpen,
    title: 'Getting Started',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Welcome to DriveLedger. This application helps you track every financial and maintenance
          aspect of vehicle ownership -- costs, loans, repairs, services, fuel economy, inspections,
          taxes, supplies, equipment, and more.
        </p>
        <h4 className="text-zinc-50 font-medium">Quick Start</h4>
        <ol className="list-decimal list-inside space-y-2">
          <li>Add your vehicle in the Vehicles section with basic details.</li>
          <li>Set up recurring costs like insurance, tax, and fuel estimates.</li>
          <li>Track any loans or financing tied to your vehicle.</li>
          <li>Log repairs, services, and upgrades as they happen.</li>
          <li>Record fuel fill-ups to track consumption and L/100km.</li>
          <li>Create savings goals for future purchases or maintenance funds.</li>
          <li>Set up reminders for inspections, tax due dates, and maintenance intervals.</li>
          <li>Use the Task Planner to organize upcoming work on a Kanban board.</li>
        </ol>
        <h4 className="text-zinc-50 font-medium">Navigation</h4>
        <p>
          Use the sidebar to navigate between sections. Items are grouped into categories: Overview,
          Vehicle Data, Financial, Maintenance, Planning, and System. The dashboard gives you a quick
          overview of all your vehicles with charts, analytics, and a year filter.
        </p>
        <h4 className="text-zinc-50 font-medium">Global Search</h4>
        <p>
          Use the global search to find any record across all sections -- vehicles, costs, repairs,
          services, fuel logs, and more. Results link directly to the relevant item.
        </p>
      </div>
    ),
  },
  {
    id: 'vehicles',
    icon: Car,
    title: 'Vehicles',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Vehicles are the core entity in the app. Each vehicle stores essential information and
          serves as the anchor for all records: costs, loans, repairs, services, upgrades, fuel logs,
          odometer readings, inspections, taxes, supplies, equipment, and notes.
        </p>
        <h4 className="text-zinc-50 font-medium">Vehicle Fields</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Brand / Model / Variant</span> - Vehicle identification</li>
          <li><span className="text-zinc-300">License Plate</span> - Registration number</li>
          <li><span className="text-zinc-300">HSN / TSN</span> - German type approval numbers for insurance lookup</li>
          <li><span className="text-zinc-300">Fuel Type</span> - Diesel, Gasoline, Electric, Hybrid, or LPG</li>
          <li><span className="text-zinc-300">Mileage</span> - Current and estimated annual mileage</li>
          <li><span className="text-zinc-300">Consumption</span> - Average fuel consumption for cost estimates</li>
          <li><span className="text-zinc-300">Status</span> - Owned or Planned</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Vehicle Detail View (12 Tabs)</h4>
        <p>
          Click on a vehicle card to open the detail view with 12 tabs:
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Stats</span> - Financial breakdown, cost distribution charts</li>
          <li><span className="text-zinc-300">Costs</span> - All costs associated with the vehicle</li>
          <li><span className="text-zinc-300">Repairs</span> - Unplanned fix history</li>
          <li><span className="text-zinc-300">Services</span> - Planned maintenance records</li>
          <li><span className="text-zinc-300">Upgrades</span> - Modifications and tuning</li>
          <li><span className="text-zinc-300">Fuel</span> - Fill-up log with L/100km calculation</li>
          <li><span className="text-zinc-300">Odometer</span> - Mileage readings over time</li>
          <li><span className="text-zinc-300">Loans</span> - Active loans and amortization</li>
          <li><span className="text-zinc-300">Savings</span> - Savings goals and transactions</li>
          <li><span className="text-zinc-300">Inspections</span> - Pass/fail forms and findings</li>
          <li><span className="text-zinc-300">Taxes</span> - Tax and registration tracking</li>
          <li><span className="text-zinc-300">Notes</span> - Free-form notes</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Vehicle Sharing</h4>
        <p>
          Share vehicles with other users to allow collaborative tracking. Shared users can view and
          add records to the shared vehicle.
        </p>
        <h4 className="text-zinc-50 font-medium">QR Codes</h4>
        <p>
          Generate QR codes for vehicles for quick access or physical labeling.
        </p>
      </div>
    ),
  },
  {
    id: 'costs',
    icon: CreditCard,
    title: 'Costs & Expenses',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track all recurring and one-time costs associated with your vehicles. Costs are
          automatically converted to monthly and yearly totals for easy comparison.
        </p>
        <h4 className="text-zinc-50 font-medium">Cost Categories</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Tax</span> - Annual vehicle tax</li>
          <li><span className="text-zinc-300">Insurance</span> - Liability, comprehensive, or partial coverage</li>
          <li><span className="text-zinc-300">Fuel</span> - Estimated monthly fuel costs</li>
          <li><span className="text-zinc-300">Care & Cleaning</span> - Wash, detailing, products</li>
          <li><span className="text-zinc-300">Repair</span> - Unexpected repair costs</li>
          <li><span className="text-zinc-300">Inspection (TUV)</span> - Periodic technical inspection</li>
          <li><span className="text-zinc-300">Financing</span> - Loan-related costs</li>
          <li><span className="text-zinc-300">Savings</span> - Set-aside amounts</li>
          <li><span className="text-zinc-300">Other</span> - Anything else</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Frequency</h4>
        <p>
          Costs can be set as one-time, monthly, quarterly, semi-annual, or yearly. The system
          normalizes all frequencies to a monthly rate for comparison.
        </p>
        <h4 className="text-zinc-50 font-medium">Paid By</h4>
        <p>
          Assign costs to different people to track who pays what. Add people in the Persons section
          first, then select them when adding costs.
        </p>
        <h4 className="text-zinc-50 font-medium">Tags</h4>
        <p>
          Add tags to cost entries for custom categorization and filtering.
        </p>
        <h4 className="text-zinc-50 font-medium">Bulk Operations</h4>
        <p>
          Select multiple cost entries to edit or delete them in bulk.
        </p>
      </div>
    ),
  },
  {
    id: 'services',
    icon: Wrench,
    title: 'Service Records',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track planned maintenance events such as oil changes, brake pad replacements, filter swaps,
          and scheduled inspections. Services differ from repairs in that they are planned and
          preventive rather than reactive.
        </p>
        <h4 className="text-zinc-50 font-medium">Service Fields</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Date</span> - When the service was performed</li>
          <li><span className="text-zinc-300">Description</span> - What was done</li>
          <li><span className="text-zinc-300">Category</span> - Type of service (oil change, brakes, filters, etc.)</li>
          <li><span className="text-zinc-300">Cost</span> - Total cost</li>
          <li><span className="text-zinc-300">Mileage</span> - Odometer reading at time of service</li>
          <li><span className="text-zinc-300">Workshop</span> - Where the work was performed</li>
        </ul>
        <p>
          Services are shown in the vehicle detail view under the Services tab and are included
          in maintenance reports.
        </p>
      </div>
    ),
  },
  {
    id: 'repairs',
    icon: Wrench,
    title: 'Repairs',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Log every unplanned repair to build a comprehensive fix history. This helps track total
          repair costs and identify recurring issues.
        </p>
        <h4 className="text-zinc-50 font-medium">Repair Fields</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Date</span> - When the repair was done</li>
          <li><span className="text-zinc-300">Description</span> - What was repaired</li>
          <li><span className="text-zinc-300">Category</span> - Type of work (engine, brakes, tires, etc.)</li>
          <li><span className="text-zinc-300">Cost</span> - Total cost of the repair</li>
          <li><span className="text-zinc-300">Mileage</span> - Odometer reading at time of repair</li>
          <li><span className="text-zinc-300">Workshop</span> - Where the work was done</li>
        </ul>
        <p>
          The repairs page shows a timeline view and cost summary. You can filter by vehicle and
          category to find specific entries.
        </p>
      </div>
    ),
  },
  {
    id: 'upgrades',
    icon: Wrench,
    title: 'Upgrades & Modifications',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track vehicle modifications, tuning, and aftermarket parts. Upgrades capture the cost and
          details of enhancements you have made to your vehicle.
        </p>
        <h4 className="text-zinc-50 font-medium">Examples</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Performance tuning and ECU remaps</li>
          <li>Suspension upgrades (coilovers, springs, sway bars)</li>
          <li>Exhaust system modifications</li>
          <li>Wheels and tire upgrades</li>
          <li>Interior modifications (seats, steering wheel, trim)</li>
          <li>Audio and infotainment upgrades</li>
          <li>Exterior modifications (body kits, wraps, lighting)</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'fuel',
    icon: Fuel,
    title: 'Fuel Tracking',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Log every fuel fill-up to track consumption, costs, and fuel economy over time.
        </p>
        <h4 className="text-zinc-50 font-medium">Fill-up Fields</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Date</span> - When you refueled</li>
          <li><span className="text-zinc-300">Liters</span> - Amount of fuel added</li>
          <li><span className="text-zinc-300">Cost</span> - Total cost of the fill-up</li>
          <li><span className="text-zinc-300">Odometer</span> - Current mileage reading</li>
          <li><span className="text-zinc-300">Full Tank</span> - Whether it was a full fill-up</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">L/100km Calculation</h4>
        <p>
          When you log consecutive full tank fill-ups, the system calculates your actual fuel
          consumption in liters per 100 kilometers. Charts show consumption trends over time so you
          can spot changes in efficiency.
        </p>
      </div>
    ),
  },
  {
    id: 'odometer',
    icon: Gauge,
    title: 'Odometer Logging',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Record odometer readings independently of fuel fill-ups. This provides a complete mileage
          history for your vehicle and helps calculate usage patterns, cost-per-km, and service
          intervals.
        </p>
        <h4 className="text-zinc-50 font-medium">Usage</h4>
        <p>
          Log readings periodically or at specific events (start of month, before/after trips, etc.).
          The vehicle detail view shows a timeline of readings with distance calculations between
          entries.
        </p>
      </div>
    ),
  },
  {
    id: 'loans',
    icon: CreditCard,
    title: 'Loans & Financing',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track vehicle financing including loan amount, monthly payments, interest rates, and
          optional additional savings alongside your loan payments.
        </p>
        <h4 className="text-zinc-50 font-medium">Loan Schedule</h4>
        <p>
          Each loan generates a repayment schedule showing month-by-month breakdowns of payments,
          remaining debt, and accumulated savings. The progress bar shows how far along you are.
        </p>
        <h4 className="text-zinc-50 font-medium">Additional Savings</h4>
        <p>
          You can set an additional savings amount per month alongside your loan payment. This helps
          you build up funds for the balloon payment or to save for your next vehicle while paying
          off the current one.
        </p>
        <h4 className="text-zinc-50 font-medium">Calculation Formula</h4>
        <CodeBlock>{`Monthly Payment = P * [r(1+r)^n] / [(1+r)^n - 1]

Where:
  P = Loan principal (price - down payment)
  r = Monthly interest rate (annual rate / 12)
  n = Number of monthly payments`}</CodeBlock>
      </div>
    ),
  },
  {
    id: 'savings',
    icon: PiggyBank,
    title: 'Savings Goals',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Create savings goals tied to vehicles. The system tracks monthly contributions and
          manual transactions to show progress toward your target.
        </p>
        <h4 className="text-zinc-50 font-medium">Automatic Contributions</h4>
        <p>
          When you set a monthly contribution, the system calculates accumulated savings based on
          months elapsed since the start date. This gives you a projected balance without needing
          to log every monthly deposit.
        </p>
        <h4 className="text-zinc-50 font-medium">Manual Transactions</h4>
        <p>
          You can also add manual deposits or withdrawals for lump-sum contributions or unexpected
          expenses. These are added to (or subtracted from) the automatic contribution total.
        </p>
        <h4 className="text-zinc-50 font-medium">Progress Tracking</h4>
        <p>
          Each goal shows a progress bar with current balance vs. target amount. Projection charts
          show when you are expected to reach your goal.
        </p>
      </div>
    ),
  },
  {
    id: 'inspections',
    icon: ClipboardCheck,
    title: 'Inspections',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Record vehicle inspections (TUV, MOT, safety checks) with structured pass/fail forms.
        </p>
        <h4 className="text-zinc-50 font-medium">Inspection Fields</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Date</span> - When the inspection was performed</li>
          <li><span className="text-zinc-300">Type</span> - Type of inspection</li>
          <li><span className="text-zinc-300">Result</span> - Pass or fail</li>
          <li><span className="text-zinc-300">Findings</span> - Issues found during inspection</li>
          <li><span className="text-zinc-300">Cost</span> - Inspection fee</li>
          <li><span className="text-zinc-300">Next Due</span> - When the next inspection is due</li>
        </ul>
        <p>
          Track inspection history per vehicle and set reminders for upcoming inspections.
        </p>
      </div>
    ),
  },
  {
    id: 'taxes',
    icon: Receipt,
    title: 'Taxes & Registration',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track recurring vehicle taxes and registration fees. The system alerts you when payments
          are coming due.
        </p>
        <h4 className="text-zinc-50 font-medium">Tax Fields</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Type</span> - Vehicle tax, registration fee, emissions charge, etc.</li>
          <li><span className="text-zinc-300">Amount</span> - Payment amount</li>
          <li><span className="text-zinc-300">Due Date</span> - When the payment is due</li>
          <li><span className="text-zinc-300">Frequency</span> - How often it recurs</li>
          <li><span className="text-zinc-300">Status</span> - Paid or pending</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'supplies',
    icon: Package,
    title: 'Supplies Inventory',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track supplies and consumables -- both per-vehicle items and shop-wide inventory.
        </p>
        <h4 className="text-zinc-50 font-medium">Per-Vehicle Supplies</h4>
        <p>
          Items tied to a specific vehicle: spare bulbs, touch-up paint, specific oil filters, etc.
        </p>
        <h4 className="text-zinc-50 font-medium">Shop-Wide Supplies</h4>
        <p>
          General supplies not tied to a specific vehicle: tools, cleaning products, general fluids, etc.
        </p>
        <h4 className="text-zinc-50 font-medium">Tracking</h4>
        <p>
          Track quantity on hand, cost, and notes for each supply item.
        </p>
      </div>
    ),
  },
  {
    id: 'equipment',
    icon: Boxes,
    title: 'Equipment Tracking',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Track larger equipment items associated with your vehicles.
        </p>
        <h4 className="text-zinc-50 font-medium">Examples</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Seasonal tires (summer/winter sets)</li>
          <li>Trailers</li>
          <li>Roof boxes and cargo carriers</li>
          <li>Bike racks</li>
          <li>Snow chains</li>
          <li>Car covers</li>
        </ul>
        <p>
          Equipment can be assigned to specific vehicles and tracked with purchase date, cost, and
          condition notes.
        </p>
      </div>
    ),
  },
  {
    id: 'planner',
    icon: KanbanSquare,
    title: 'Task Planner',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          A Kanban-style board for planning and tracking vehicle-related tasks.
        </p>
        <h4 className="text-zinc-50 font-medium">Task Management</h4>
        <p>
          Create tasks, assign them to columns (e.g. To Do, In Progress, Done), and drag them
          between columns as work progresses. Tasks can be linked to specific vehicles and given
          due dates.
        </p>
        <h4 className="text-zinc-50 font-medium">Use Cases</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Plan upcoming maintenance work</li>
          <li>Track modification projects</li>
          <li>Organize seasonal tasks (tire swap, winterization)</li>
          <li>Keep a to-do list of parts to order</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'reminders',
    icon: Bell,
    title: 'Reminders',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Set up reminders for important dates and recurring tasks related to your vehicles.
          Reminders can be based on calendar dates or mileage thresholds.
        </p>
        <h4 className="text-zinc-50 font-medium">Reminder Types</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><span className="text-zinc-300">Cost Due</span> - Upcoming cost payments</li>
          <li><span className="text-zinc-300">Loan Payment</span> - Monthly loan due dates</li>
          <li><span className="text-zinc-300">Inspection</span> - TUV and other inspections</li>
          <li><span className="text-zinc-300">Insurance</span> - Policy renewals</li>
          <li><span className="text-zinc-300">Savings Goal</span> - Milestone reminders</li>
          <li><span className="text-zinc-300">Mileage-Based</span> - Triggered at specific odometer readings</li>
          <li><span className="text-zinc-300">Custom</span> - Any other reminder</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Recurring Reminders</h4>
        <p>
          Reminders can be set to repeat daily, weekly, monthly, or yearly. When snoozed, the
          reminder is pushed to the next day at 9:00 AM.
        </p>
        <h4 className="text-zinc-50 font-medium">Email Notifications</h4>
        <p>
          If email is enabled on the server, reminders can optionally send email notifications
          when they become due.
        </p>
      </div>
    ),
  },
  {
    id: 'purchase-planner',
    icon: ShoppingCart,
    title: 'Purchase Planner',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Compare potential vehicle purchases side by side. Evaluate financing options, estimated
          running costs, and rate each option to find the best fit.
        </p>
        <h4 className="text-zinc-50 font-medium">Vehicle Comparison</h4>
        <p>
          When you have two or more planned purchases, a comparison table automatically appears
          showing key metrics side by side: price, financing costs, estimated monthly expenses,
          and your personal rating.
        </p>
        <h4 className="text-zinc-50 font-medium">Financing Calculator</h4>
        <p>
          Use the built-in calculator to experiment with different down payments, interest rates,
          and loan durations. Results update in real-time.
        </p>
        <h4 className="text-zinc-50 font-medium">Convert to Vehicle</h4>
        <p>
          Once you decide on a purchase, use the "Convert to Vehicle" action to create a real
          vehicle entry from the planned purchase. This transfers all the basic information and
          removes it from the planner.
        </p>
      </div>
    ),
  },
  {
    id: 'attachments-tags',
    icon: Tag,
    title: 'Attachments, Tags & Bulk Operations',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <h4 className="text-zinc-50 font-medium">File Attachments</h4>
        <p>
          Attach files (photos, PDFs, invoices, documents) to records across the application.
          Attachments are stored on the server and linked to the relevant record.
        </p>
        <h4 className="text-zinc-50 font-medium">Tags</h4>
        <p>
          Add custom tags to any record type for flexible categorization. Tags make it easy to
          filter and group records across different sections.
        </p>
        <h4 className="text-zinc-50 font-medium">Bulk Operations</h4>
        <p>
          Select multiple records and perform batch operations (edit, delete) to save time when
          managing large amounts of data.
        </p>
      </div>
    ),
  },
  {
    id: 'search-reports',
    icon: Search,
    title: 'Search & Reports',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <h4 className="text-zinc-50 font-medium">Global Search</h4>
        <p>
          Search across all record types from a single search bar. Results are grouped by type
          and link directly to the matching record.
        </p>
        <h4 className="text-zinc-50 font-medium">Maintenance Reports</h4>
        <p>
          Generate maintenance reports that combine service records, repairs, inspections, and
          costs into a comprehensive overview. Useful for resale documentation or insurance claims.
        </p>
      </div>
    ),
  },
  {
    id: 'sharing-webhooks',
    icon: Share2,
    title: 'Sharing & Webhooks',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <h4 className="text-zinc-50 font-medium">Vehicle Sharing</h4>
        <p>
          Share vehicles with other DriveLedger users for collaborative tracking. Useful for
          families or businesses managing a shared fleet.
        </p>
        <h4 className="text-zinc-50 font-medium">Webhooks</h4>
        <p>
          Configure webhooks to send notifications to external services when events occur in
          DriveLedger. Integrate with messaging platforms, automation tools, or custom applications.
        </p>
      </div>
    ),
  },
  {
    id: 'import-export',
    icon: FileText,
    title: 'Import & Export',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <h4 className="text-zinc-50 font-medium">Data Export</h4>
        <p>
          Export all your data as JSON for backup or migration. Available in Settings &gt; Data.
        </p>
        <h4 className="text-zinc-50 font-medium">Data Import</h4>
        <p>
          Import data from a previous DriveLedger export to restore or transfer your information.
        </p>
        <h4 className="text-zinc-50 font-medium">LubeLogger Import</h4>
        <p>
          Import data from LubeLogger to migrate your vehicle records into DriveLedger.
        </p>
      </div>
    ),
  },
  {
    id: 'persons',
    icon: Users,
    title: 'Persons & Cost Sharing',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Manage people involved in vehicle expenses. Each person has a name and a color for
          visual identification in charts and cost breakdowns.
        </p>
        <h4 className="text-zinc-50 font-medium">Cost Assignment</h4>
        <p>
          When adding costs, select the person responsible for that payment. The dashboard and
          vehicle detail views show cost distribution per person, making it easy to split or
          track shared vehicle expenses.
        </p>
        <h4 className="text-zinc-50 font-medium">Adding Persons</h4>
        <p>
          Add persons before assigning costs. Navigate to the costs page and use the person
          management section to create entries. Each person needs a unique name.
        </p>
      </div>
    ),
  },
  {
    id: 'settings',
    icon: Settings,
    title: 'Settings & Account',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Settings are split into <strong className="text-zinc-300">User Settings</strong> (accessible via the user icon in the sidebar)
          and <strong className="text-zinc-300">Admin Settings</strong> (visible only to admins in the navigation).
        </p>
        <h4 className="text-zinc-50 font-medium">User Settings</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-zinc-300">Profile</strong> — Change your password, view account details and email verification status.</li>
          <li><strong className="text-zinc-300">Preferences</strong> — Theme, language, currency, date format, fuel economy unit, and visible tabs.</li>
          <li><strong className="text-zinc-300">Extra Fields</strong> — Define custom fields per record type (e.g. add a "Tire brand" field to services).</li>
          <li><strong className="text-zinc-300">Household</strong> — Create households to share vehicles with family or team members. The head user manages members and permissions.</li>
          <li><strong className="text-zinc-300">Data</strong> — Export/import your data as JSON, import from LubeLogger, or delete your account.</li>
          <li><strong className="text-zinc-300">API Tokens</strong> — Generate tokens for programmatic access. Tokens can be toggled active/inactive.</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Admin Settings</h4>
        <ul className="list-disc list-inside space-y-1">
          <li><strong className="text-zinc-300">Defaults</strong> — Set default preferences for newly created users.</li>
          <li><strong className="text-zinc-300">Admin</strong> — Manage users, generate registration invite tokens, reset passwords.</li>
          <li><strong className="text-zinc-300">Translations</strong> — Edit and customize translations for any language.</li>
          <li><strong className="text-zinc-300">Custom Widgets</strong> — Create custom dashboard widgets with HTML/JavaScript.</li>
          <li><strong className="text-zinc-300">Data</strong> — Full database backup and restore (all users).</li>
        </ul>
      </div>
    ),
  },
  {
    id: 'api',
    icon: Code,
    title: 'API Reference',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          The application provides a REST API for all resources. Authenticate via JWT Bearer token
          or API key.
        </p>
        <h4 className="text-zinc-50 font-medium">Authentication</h4>
        <CodeBlock>{`# JWT Bearer
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \\
  https://your-domain/api/vehicles

# API Key
curl -H "Authorization: ApiKey dl_token:your-secret" \\
  https://your-domain/api/vehicles`}</CodeBlock>
        <h4 className="text-zinc-50 font-medium">Resource Endpoints</h4>
        <CodeBlock>{`GET/POST           /api/vehicles
GET/PUT/DELETE     /api/vehicles/:id
GET/POST           /api/costs
GET/POST           /api/loans
GET/POST           /api/repairs
GET/POST           /api/services
GET/POST           /api/upgrades
GET/POST           /api/fuel
GET/POST           /api/odometer
GET/POST           /api/inspections
GET/POST           /api/taxes
GET/POST           /api/supplies
GET/POST           /api/equipment
GET/POST           /api/reminders
GET/POST           /api/purchases
GET/POST           /api/persons
GET/POST           /api/planner-tasks
GET/POST           /api/vehicle-notes
GET/POST           /api/attachments
GET                /api/search?q=...
GET                /api/reports/...
GET                /api/savings/goals
POST               /api/savings/goals/:id/transactions`}</CodeBlock>
        <h4 className="text-zinc-50 font-medium">Data Endpoints</h4>
        <CodeBlock>{`GET    /api/data/export       - Export all data (JSON)
POST   /api/data/import       - Import data (JSON)
GET    /api/health            - Health check (no auth)
GET    /api/config            - Server config (no auth)`}</CodeBlock>
        <h4 className="text-zinc-50 font-medium">Admin Endpoints</h4>
        <CodeBlock>{`GET    /api/admin/users                    - List users
DELETE /api/admin/users/:id                - Delete user
POST   /api/admin/registration-tokens      - Generate token
GET    /api/admin/registration-tokens      - List tokens
POST   /api/admin/users/:id/reset-password - Reset password`}</CodeBlock>
      </div>
    ),
  },
  {
    id: 'security',
    icon: Shield,
    title: 'Security & Privacy',
    content: (
      <div className="space-y-4 text-sm text-zinc-400 leading-relaxed">
        <p>
          Your data is stored securely in a MariaDB database. The application uses JWT-based
          authentication with refresh tokens stored in HTTP-only cookies.
        </p>
        <h4 className="text-zinc-50 font-medium">Authentication</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Access tokens expire after 15 minutes</li>
          <li>Refresh tokens are stored in HTTP-only secure cookies</li>
          <li>Passwords are hashed using bcrypt (12 salt rounds)</li>
          <li>Registration requires an invite token from an admin</li>
          <li>API tokens hashed with SHA-256, secrets hashed with bcrypt</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Server Hardening</h4>
        <ul className="list-disc list-inside space-y-1">
          <li>Rate limiting: 100 req/min general, 5 req/min on auth endpoints</li>
          <li>Helmet.js security headers (CSP, HSTS, X-Frame-Options)</li>
          <li>CORS whitelist restricted to configured frontend origin</li>
          <li>Parameterized SQL queries via mysql2 (no SQL injection)</li>
          <li>Non-root Docker container execution</li>
        </ul>
        <h4 className="text-zinc-50 font-medium">Data Isolation</h4>
        <p>
          Each user can only access their own data. All database queries are scoped to the
          authenticated user's ID. API tokens inherit the permissions of the user who created them.
          Admin endpoints are restricted to admin users only.
        </p>
        <h4 className="text-zinc-50 font-medium">Account Deletion</h4>
        <p>
          You can delete your account and all associated data from User Settings → Data. This action
          is irreversible and removes all vehicles, costs, loans, repairs, services, upgrades,
          fuel logs, inspections, taxes, supplies, equipment, savings, reminders, and API tokens.
        </p>
      </div>
    ),
  },
];

const CHANGELOG_CONTENT = (() => {
      const T = ({ type }: { type: 'new' | 'fix' | 'change' | 'remove' }) => {
        const styles = {
          new: 'bg-emerald-400/15 text-emerald-400',
          fix: 'bg-sky-400/15 text-sky-400',
          change: 'bg-amber-400/15 text-amber-400',
          remove: 'bg-red-400/15 text-red-400',
        };
        return <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${styles[type]} mr-2`}>{type}</span>;
      };
      return (
        <div className="space-y-6 text-sm text-zinc-400 leading-relaxed">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-violet-500/15 text-violet-400 px-2 py-0.5 rounded-md">v3.0.0</span>
              <span className="text-xs text-zinc-600">2026-03-29</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Settings Overhaul & i18n Completeness</h4>
            <ul className="space-y-2">
              <li><T type="new" />Full-screen centered User Settings overlay (Profile, Preferences, Extra Fields, Household, Data, API Tokens)</li>
              <li><T type="new" />User Data tab with Export, Import, LubeLogger import, and account deletion</li>
              <li><T type="new" />Complete i18n coverage — all missing translation keys added across 11 languages</li>
              <li><T type="change" />Extra Fields and Household moved from Admin Settings to User Settings</li>
              <li><T type="change" />Data export/import/LubeLogger moved from Admin Settings to User Settings</li>
              <li><T type="change" />Admin Settings page now admin-only (Defaults, Admin, Translations, Custom Widgets, Backup/Restore)</li>
              <li><T type="change" />Settings nav link hidden for non-admin users</li>
              <li><T type="change" />Page content uses full window width (removed max-w-6xl constraint)</li>
              <li><T type="fix" />Sort dropdown labels showing raw i18n keys instead of translated text</li>
              <li><T type="fix" />Hardcoded English strings in Odometer and Vehicle Edit forms replaced with i18n calls</li>
              <li><T type="fix" />Modal title bug in Odometer tab (string literal instead of function call)</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v2.0.0</span>
              <span className="text-xs text-zinc-600">2026-03-27</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Major Feature Release</h4>
            <ul className="space-y-2">
              <li><T type="new" />Service Records for planned maintenance with categories and intervals</li>
              <li><T type="new" />Upgrade Records for vehicle modifications and tuning</li>
              <li><T type="new" />Fuel Tracking with automatic L/100km consumption calculation</li>
              <li><T type="new" />Odometer Logging for independent mileage history</li>
              <li><T type="new" />Inspections with structured pass/fail forms and findings</li>
              <li><T type="new" />Taxes & Registration tracking with due date alerts</li>
              <li><T type="new" />Supplies Inventory for per-vehicle and shop-wide items</li>
              <li><T type="new" />Equipment Tracking for seasonal tires, trailers, and accessories</li>
              <li><T type="new" />Task Planner with Kanban-style board</li>
              <li><T type="new" />Vehicle Sharing between users</li>
              <li><T type="new" />Webhooks for external integrations</li>
              <li><T type="new" />Bulk Operations for batch editing and deleting</li>
              <li><T type="new" />QR Code Generation for vehicles</li>
              <li><T type="new" />LubeLogger data import</li>
              <li><T type="new" />Global Search across all record types</li>
              <li><T type="new" />Maintenance Reports generation</li>
              <li><T type="new" />File Attachments on records</li>
              <li><T type="new" />Tags on all record types for custom categorization</li>
              <li><T type="new" />Year filter on Dashboard analytics</li>
              <li><T type="change" />Sidebar reorganized with grouped sections (Overview, Vehicle Data, Financial, Maintenance, Planning, System)</li>
              <li><T type="change" />VehicleDetail expanded to 12 tabs (Stats, Costs, Repairs, Services, Upgrades, Fuel, Odometer, Loans, Savings, Inspections, Taxes, Notes)</li>
              <li><T type="change" />Dashboard enhanced with fuel economy charts and upcoming reminders section</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v1.5.0</span>
              <span className="text-xs text-zinc-600">2026-03-26</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Complete UI Redesign</h4>
            <ul className="space-y-2">
              <li><T type="new" />Completely rebuilt frontend with minimal dark design</li>
              <li><T type="new" />Framer-motion page transitions and animations</li>
              <li><T type="new" />Split-screen login and registration pages</li>
              <li><T type="new" />New app logo</li>
              <li><T type="new" />Changelog section in documentation</li>
              <li><T type="new" />Version number in settings</li>
              <li><T type="change" />Redesigned sidebar navigation layout</li>
              <li><T type="change" />Improved spacing and typography throughout</li>
              <li><T type="remove" />Removed old shadcn/ui component library</li>
              <li><T type="remove" />Removed unnecessary CSS bloat</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v1.4.0</span>
              <span className="text-xs text-zinc-600">2025-12-15</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">MariaDB Migration</h4>
            <ul className="space-y-2">
              <li><T type="change" />Migrated database from SQLite to MariaDB</li>
              <li><T type="new" />Docker Compose setup with persistent MariaDB container</li>
              <li><T type="fix" />Improved query performance and concurrent access</li>
              <li><T type="remove" />Removed SQLite dependency</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v1.3.0</span>
              <span className="text-xs text-zinc-600">2025-11-20</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Email & Reminders</h4>
            <ul className="space-y-2">
              <li><T type="new" />EMAIL_ENABLED toggle for optional email features</li>
              <li><T type="new" />Email verification system for new accounts</li>
              <li><T type="new" />Reminder system with email notifications</li>
              <li><T type="new" />Recurring reminders (daily, weekly, monthly, yearly)</li>
              <li><T type="new" />Snooze and dismiss functionality</li>
              <li><T type="fix" />Clean login page design</li>
              <li><T type="fix" />Support username or email login</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v1.2.0</span>
              <span className="text-xs text-zinc-600">2025-10-05</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Purchase Planner & Savings</h4>
            <ul className="space-y-2">
              <li><T type="new" />Purchase planner with side-by-side vehicle comparison</li>
              <li><T type="new" />Built-in financing calculator</li>
              <li><T type="new" />Savings goals with transaction tracking</li>
              <li><T type="new" />Savings growth projection charts</li>
              <li><T type="new" />Convert planned purchases to owned vehicles</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v1.1.0</span>
              <span className="text-xs text-zinc-600">2025-08-15</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Loans & API Tokens</h4>
            <ul className="space-y-2">
              <li><T type="new" />Loan tracking with amortization schedules</li>
              <li><T type="new" />Loan progress visualization with charts</li>
              <li><T type="new" />API token system for programmatic access</li>
              <li><T type="new" />Data export and import functionality</li>
            </ul>
          </div>

          <div className="border-t border-zinc-800 pt-5">
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-md">v1.0.0</span>
              <span className="text-xs text-zinc-600">2025-06-01</span>
            </div>
            <h4 className="text-zinc-50 font-medium mb-3">Initial Release</h4>
            <ul className="space-y-2">
              <li><T type="new" />Vehicle management with detailed profiles</li>
              <li><T type="new" />Cost tracking with categories and frequencies</li>
              <li><T type="new" />Repair history logging</li>
              <li><T type="new" />Dashboard with charts and overview</li>
              <li><T type="new" />User authentication with JWT and bcrypt</li>
              <li><T type="new" />Admin panel with registration tokens</li>
              <li><T type="new" />Rate limiting and security headers</li>
            </ul>
          </div>
        </div>
      );
})();

export default function Wiki() {
  const [expanded, setExpanded] = useState<string | null>('getting-started');
  const [changelogOpen, setChangelogOpen] = useState(false);

  const toggle = (id: string) => {
    setExpanded((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-50">Wiki</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Documentation and guides for using DriveLedger
          </p>
        </div>
        <button
          onClick={() => setChangelogOpen(!changelogOpen)}
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors shrink-0',
            changelogOpen
              ? 'bg-violet-500/15 text-violet-400'
              : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:border-zinc-700'
          )}
        >
          <History size={16} />
          Changelog
          <span className="text-xs font-mono bg-violet-500/15 text-violet-400 px-1.5 py-0.5 rounded">v{APP_VERSION}</span>
        </button>
      </div>

      {/* Changelog panel */}
      <AnimatePresence>
        {changelogOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 max-h-[60vh] overflow-y-auto">
              {CHANGELOG_CONTENT}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Accordion Sections */}
      <div className="space-y-3">
        {SECTIONS.map((section) => (
          <div
            key={section.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggle(section.id)}
              className="w-full flex items-center gap-3 px-6 py-4 text-left hover:bg-zinc-800/30 transition-colors"
            >
              <div
                className={cn(
                  'p-2 rounded-lg',
                  expanded === section.id ? 'bg-violet-500/15 text-violet-400' : 'bg-zinc-800 text-zinc-500'
                )}
              >
                <section.icon size={18} />
              </div>
              <span
                className={cn(
                  'flex-1 text-sm font-medium',
                  expanded === section.id ? 'text-zinc-50' : 'text-zinc-400'
                )}
              >
                {section.title}
              </span>
              <motion.div
                animate={{ rotate: expanded === section.id ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronDown size={16} className="text-zinc-600" />
              </motion.div>
            </button>

            <AnimatePresence initial={false}>
              {expanded === section.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="px-6 pb-5 pt-1 border-t border-zinc-800">
                    {section.content}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    </div>
  );
}
