import { Info } from 'lucide-react';

export function WorkflowInfo() {
  return (
    <div className="mb-6 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
      <div className="flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 mt-0.5" />
        <div>
          <h3 className="font-bold text-blue-900 mb-2">Daily Workflow Order</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. <strong>All TikTok accounts</strong> (TikTok 1 → TikTok 2 → ...)</p>
            <p>2. <strong>All Threads accounts</strong> (Threads 1 → Threads 2 → ...)</p>
            <p>3. <strong>Instagram:</strong> Post → Story → 10 likes back → 20 story views → Scroll feed</p>
            <p>4. <strong>Facebook:</strong> Reel → Post → Like users → Scroll feed</p>
            <p className="mt-2 pt-2 border-t border-blue-300">
              <strong>📱 Each platform:</strong> 3 min homefeed scroll + like & save content
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

