// Points & Rewards page created by Cascade
import React from "react";

const PointsPage: React.FC = () => {
  return (
    <div className="max-w-3xl mx-auto py-8 space-y-8">
      <h1 className="text-3xl font-bold">Points &amp; Rewards</h1>

      <section>
        <h2 className="text-xl font-semibold mb-2">How you earn points</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>+100 pts for creating a free account</li>
          <li>+50 pts for booking a charter</li>
          <li>+100 pts for completing a charter</li>
          <li>+20 pts for starting a new thread on the message board</li>
          <li>+10 pts for posting a reply/message</li>
          <li>+5 pts for each reaction your post receives</li>
          <li>+5 pts for logging in each day</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Media uploads</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Image uploads are <strong>free</strong> for users and captains.</li>
          <li>Video uploads cost <strong>10 pts per minute</strong> (rounded up).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-xl font-semibold mb-2">Avatar shop</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>Hats: ~50–200 pts</li>
          <li>Shirts &amp; vests: ~100–300 pts</li>
          <li>Fishing gear: ~150–500 pts</li>
          <li>Special effects: ~200–1000 pts</li>
        </ul>
      </section>
    </div>
  );
};

export default PointsPage;
