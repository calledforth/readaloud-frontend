'use client';

import React from 'react';
import {
	Modal,
	ModalBody,
	ModalContent,
	ModalDescription,
	ModalHeader,
	ModalTitle,
	ModalTrigger,
} from './modal';
import { SessionHistory } from './SessionHistory';
import type { SessionRecord } from '../lib/sessionTypes';

interface HistoryModalProps {
	sessions: SessionRecord[];
	onResume: (id: string) => void;
	onRefresh?: () => void;
	children: React.ReactNode;
}

export function HistoryModal({ sessions, onResume, onRefresh, children }: HistoryModalProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Modal open={open} onOpenChange={setOpen}>
			<ModalTrigger asChild>
				{children}
			</ModalTrigger>
			<ModalContent className="bg-neutral-900 border-neutral-700 max-w-3xl w-full [&_[data-slot=dialog-close]>svg]:text-white [&_[data-slot=dialog-close]]:text-white [&]:!max-w-2xl">
				<ModalHeader className="pb-3">
					<ModalTitle className="text-neutral-200 text-lg">Session History</ModalTitle>
					<ModalDescription className="text-neutral-400 text-sm">
						Resume previous reading sessions
					</ModalDescription>
				</ModalHeader>
				<ModalBody className="py-1 px-0">
					<SessionHistory sessions={sessions} onResume={onResume} onRefresh={onRefresh} />
				</ModalBody>
			</ModalContent>
		</Modal>
	);
}
