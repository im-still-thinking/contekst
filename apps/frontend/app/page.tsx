"use client";
import Image from "next/image";
import { useState } from "react";

const analyticsData = [
  {
    type: "total-memories",
    value: 344
  },
  {
    type: "access-granted",
    value: 4
  },
  {
    type: "approval-requests",
    value: [
      {
        name: "Claude",
        value: 2
      },
      {
        name: "ChatGPT",
        value: 2
      }
    ]
  }
];

const memoryData = [
  {
    id: 1,
    memory: "I want to start learning figma, where do I b...",
    timeAgo: "2 hours ago",
    tags: ["UI", "Figma", "Design", "Learn", "Beginner"],
    source: "Claude",
    accessScope: "ChatGPT",
  },
  {
    id: 2,
    memory: "How easy is figma to learn? How much tim...",
    timeAgo: "4 days ago",
    tags: ["Design", "UI", "Figma"],
    source: "ChatGPT",
    accessScope: "Claude",
  },
  {
    id: 3,
    memory: "I want to start learning figma, where do I b...",
    timeAgo: "2 hours ago",
    tags: ["UI", "Figma", "Design", "Learn", "Beginner"],
    source: "Claude",
    accessScope: "ChatGPT",
  },
  {
    id: 4,
    memory: "How easy is figma to learn? How much tim...",
    timeAgo: "4 days ago",
    tags: ["Design", "UI", "Figma"],
    source: "ChatGPT",
    accessScope: "Claude",
  },
  {
    id: 5,
    memory: "I want to start learning figma, where do I b...",
    timeAgo: "2 hours ago",
    tags: ["UI", "Figma", "Design", "Learn", "Beginner"],
    source: "Claude",
    accessScope: "ChatGPT",
  },
  {
    id: 6,
    memory: "How easy is figma to learn? How much tim...",
    timeAgo: "4 days ago",
    tags: ["Design", "UI", "Figma"],
    source: "ChatGPT",
    accessScope: "Claude",
  },
  {
    id: 7,
    memory: "How easy is figma to learn? How much tim...",
    timeAgo: "4 days ago",
    tags: ["Design", "UI", "Figma"],
    source: "ChatGPT",
    accessScope: "Claude",
  },
];

export default function Dashboard() {
  const [approvalIndex, setApprovalIndex] = useState(0);
  const approvals: { name: string; value: number }[] = Array.isArray(analyticsData[2]?.value)
    ? (analyticsData[2].value as { name: string; value: number }[])
    : [];
  const currentApproval = approvals[approvalIndex] || { name: "", value: 0 };

  const goPrev = () => {
    if (approvals.length === 0) return;
    setApprovalIndex((prev) => (prev - 1 + approvals.length) % approvals.length);
  };

  const goNext = () => {
    if (approvals.length === 0) return;
    setApprovalIndex((prev) => (prev + 1) % approvals.length);
  };
  return (
    <div className="min-h-screen bg-custom-primary-200 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header Stats Cards */}
        <div className="grid grid-cols-5 gap-5 mb-8">
          {/* Total Memories Card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg border-custom-primary-300 border-[1px] flex items-end relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-custom-primary-500">{analyticsData[0]?.value.toString()}</div>
                <div className="text-custom-primary-400 font-semibold">Total Memories</div>
              </div>
              
            </div>
              <Image src="/assets/brain.svg" alt="Brain" width={180} height={180} className="absolute -top-12 -right-10" />
          </div>

          {/* Access Granted Card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg flex items-end border-custom-primary-300 border-[1px] relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-4xl font-bold text-custom-primary-500">{analyticsData[1]?.value.toString()}</div>
                <div className="text-custom-primary-400 font-semibold">Access Granted</div>
              </div>
              <Image src="/assets/lock.svg" alt="Lock" width={180} height={180} className="absolute -top-12 -right-8" />
            </div>
          </div>

          {/* Approval Requests Card */}
          <div className="bg-white rounded-3xl p-6 shadow-lg flex items-end border-custom-primary-300 border-[1px] relative overflow-hidden col-span-3">
            <div className="flex items-center justify-between">
              <div className="flex-1 relative">
                <div className="bg-custom-primary-400 text-white px-2 py-1 rounded-full text-sm font-medium mb-3 w-fit">
                  Approval Requests
                </div>
                <div className="text-4xl font-bold text-custom-primary-500 mb-2">{currentApproval.name}</div>
                <div className="text-custom-primary-400 text-base mb-4">time location of the request</div>
                <div className="flex gap-2">
                <button onClick={goPrev} className="w-7 h-7 cursor-pointer bg-custom-primary-200 rounded-full flex items-center justify-center hover:bg-opacity-80">
                  <Image src="/assets/arrow.svg" alt="Previous" width={10} height={10} className="rotate-180" />
                </button>
                <button onClick={goNext} className="w-7 h-7 cursor-pointer bg-custom-primary-200 rounded-full flex items-center justify-center hover:bg-opacity-80">
                  <Image src="/assets/arrow.svg" alt="Next" width={10} height={10} />
                </button>
              </div>
              </div>
              <div className="flex gap-2 absolute bottom-5 right-5 z-10">
                  <button className="bg-custom-primary-500 text-white px-8 py-1 shadow-lg cursor-pointer rounded-full text-lg font-medium hover:-translate-y-1 duration-200">
                    Accept
                  </button>
                  <button className="bg-custom-primary-400 text-white px-8 py-1 shadow-lg cursor-pointer rounded-full text-lg font-medium hover:-translate-y-1 duration-200">
                    Reject
                  </button>
                </div>
              
            </div>
            <Image src="/assets/claude.svg" alt="Claude" width={180} height={180} className="absolute -top-12 -right-8" />
          </div>
        </div>

        {/* Memory Table */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          {/* Table Header */}
          <div className="bg-custom-primary-400 text-white px-6 py-4">
            <div className="grid grid-cols-4 gap-4 font-medium">
              <div>Memory</div>
              <div>Tags</div>
              <div>Source</div>
              <div>Access Scope</div>
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {memoryData.map((item) => (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="grid grid-cols-4 gap-4 items-center">
                  {/* Memory Column */}
                  <div>
                    <div className="text-custom-primary-600 mb-1 truncate">{item.memory}</div>
                    <div className="text-custom-primary-400 text-xs">{item.timeAgo}</div>
                  </div>

                  {/* Tags Column */}
                  <div className="flex flex-wrap gap-2 w-64">
                    {item.tags.map((tag, index) => (
                      <span
                        key={index}
                        className="bg-custom-primary-200 text-custom-primary-500 px-2 py-1 rounded-full text-xs font-medium"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Source Column */}
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                      {item.source === "Claude" ? (
                        <Image src="/assets/claudeDark.svg" alt="Claude" width={20} height={20} />
                      ) : (
                        <Image src="/assets/openai.svg" alt="OpenAI" width={20} height={20} />
                      )}
                    </div>
                    <span className="text-custom-purple-400 font-medium">{item.source}</span>
                  </div>

                  {/* Access Scope Column */}
                  <div className="flex items-center border-[1px] border-custom-primary-300 rounded-full p-1 bg-custom-primary-200 w-fit pr-2">
                    <div className="w-8 h-6 rounded-full flex items-center justify-center">
                      {item.accessScope === "Claude" ? (
                        <Image src="/assets/claudeDark.svg" alt="Claude" width={20} height={20} />
                      ) : (
                        <Image src="/assets/openai.svg" alt="OpenAI" width={20} height={20} />
                      )}
                    </div>
                    <span className="bg-custom-purple-200 text-custom-purple-400 p-1 rounded-full text-sm font-medium">
                      {item.accessScope}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
