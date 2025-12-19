"use client";
import React, { use } from 'react';
import { ReactFlowProvider } from 'reactflow';
import { WorkflowBuilder } from '@/components/builder/WorkflowBuilder';

export default function BuilderPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    return (
        <ReactFlowProvider>
            <WorkflowBuilder id={id} />
        </ReactFlowProvider>
    );
}
