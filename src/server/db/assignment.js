import { Table, queryBuilder, convertCase, knex } from "./common";
import _ from "lodash";

async function getByUserAndCampaign(userId, campaignId, opts) {
  return await queryBuilder(Table.ASSIGNMENT, opts)
    .where({ user_id: userId, campaign_id: campaignId })
    .first();
}

async function isAssigned(userId, campaignId, opts) {
  return !!(await getByUserAndCampaign(userId, campaignId, opts));
}

async function listActiveAssignmentsForUser({ userId, organizationId }, opts) {
  const results = await queryBuilder(Table.ASSIGNMENT, opts)
    .innerJoin(Table.CAMPAIGN, "assignment.campaign_id", "campaign.id")
    .where({
      "assignment.user_id": userId,
      "campaign.organization_id": organizationId,
      "campaign.is_started": true,
      "campaign.is_archived": false
    })
    .select("assignment.*");
  return convertCase(results, opts);
}

async function countsByStatus(assignmentIds, opts) {
  const counts = await queryBuilder(Table.ASSIGNMENT, opts)
    .innerJoin(
      Table.CAMPAIGN_CONTACT,
      "assignment.id",
      "campaign_contact.assignment_id"
    )
    .select(
      "assignment.id as assignment_id",
      "campaign_contact.message_status",
      knex.raw("count(campaign_contact.id)::int as count")
    )
    .whereIn("assignment.id", assignmentIds)
    .whereNot("is_opted_out", true)
    .groupBy(["assignment.id", "campaign_contact.message_status"]);
  const groupedByAssignmentId = _.groupBy(counts, r => r.assignment_id);
  return convertCase(groupedByAssignmentId, opts);
}

async function releaseUnmessagedContacts(assignmentId, opts) {
  return queryBuilder(Table.CAMPAIGN_CONTACT, opts)
    .where({ message_status: "needsMessage", assignment_id: assignmentId })
    .update({ assignment_id: null });
}

export default {
  getByUserAndCampaign,
  isAssigned,
  listActiveAssignmentsForUser,
  countsByStatus,
  releaseUnmessagedContacts
};
