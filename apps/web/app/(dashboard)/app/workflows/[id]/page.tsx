"use client";
import React from 'react';
import { ReactFlowProvider } from 'reactflow';
import { WorkflowBuilder } from '@/components/builder/WorkflowBuilder';

export default function BuilderPage({ params }: { params: { id: string } }) {
    return (
        <ReactFlowProvider>
            <WorkflowBuilder id={params.id} />
        </ReactFlowProvider>
    );
}
