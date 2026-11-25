import type { StrapiRecord, StrapiRelationMany, StrapiRelationOne, StrapiSingleMedia } from "./common.js";


export type StrapiScientificCommitteeMemberCollection = StrapiRecord<{
	name: string;
	title: string;
	institution: string;
	expertise: any; // JSON field
	image: StrapiSingleMedia;
}>

export type StrapiResearchInitiativeCollection = StrapiRecord<{
	slug: string;
	name: string;
	acronym: string;
	subtitle?: string;
	description: string;
	fullDescription?: string;
	coordinator: StrapiRelationOne<StrapiCoordinatorCollection>;
	status: string;
	priority: string;
	startDate: string;
	endDate?: string;
	funding: string;
	totalBudget?: string;
	objectives: any; // JSON field
	keyAreas: any; // JSON field
	achievements?: any; // JSON field
	partners?: any; // JSON field
	locations?: any; // JSON field
	projects: number;
	students: number;
	publications: number;
	patents: number;
	contact?: any; // Component: contact.initiative-contact
	relatedCallIds?: any; // JSON field
	scientificCommittee: StrapiRelationMany<StrapiScientificCommitteeMemberCollection>;
}>

export type StrapiCoordinatorCollection = StrapiRecord<{
	name: string;
	title: string;
	department: string;
	bio: string;
	image?: StrapiSingleMedia;
	expertise?: any; // JSON field
	contact: any; // Component: contact.coordinator-contact
	achievements?: any; // JSON field
	publications: number;
	projects: number;
	experience?: string;
	education?: any; // JSON field
	awards?: any; // JSON field
	initiatives: StrapiRelationMany<StrapiResearchInitiativeCollection>;
}>

export type StrapiFundingCallCollection = StrapiRecord<{
	title: string;
	slug: string;
	agency: string;
	type: 'Internal' | 'External';
	scope: 'Local' | 'National' | 'International';
	status: 'draft' | 'open' | 'evaluation' | 'closed' | 'archived';
	urgency: 'low' | 'medium' | 'high' | 'urgent';
	amount: string;
	currency: string;
	deadline: string;
	domain: string;
	keyAreas?: JSON; // JSON field
	description: string;
	fullDescription?: string;
	featured: boolean;
	pinned: boolean;
	viewCount: number;
	applicationUrl?: string;
	applicationInstructions?: any; // Rich text field
	applicationDeadlineNote?: string;
	daysLeft?: number;
	image?: StrapiSingleMedia;
	isNew: boolean;
	isUpdated: boolean;
	isExtended: boolean;
	applicationDeadline?: string;
	expectedDecision?: string;
	evaluationStatus?: string;
	reviewStage?: string;
	applicationsReceived: number;
	estimatedReviewTime?: string;
	closedDate?: string;
	totalAwarded?: string;
	projectCount?: number;
	awardees?: any; // JSON field
	eligibilityCriteria?: any; // JSON field
	fundingDetails?: any; // JSON field
	timeline?: any; // JSON field
	evaluationCriteria?: any; // JSON field
	requiredDocuments?: any; // JSON field
	contactInfo?: any; // JSON field
}>