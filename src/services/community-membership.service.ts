import CommunityMembership from '@/models/communityMembership.model';
import Community from '@/models/community.model';
import { AppError } from '@/utils/app-error';

export class CommunityMembershipService {
  /**
   * Add user to community
   */

  async joinCommunity(userId: string, communityId: any) {

    const community = await Community.findById(communityId);
    if (!community) {
    throw new AppError('Community not found', 404);
    }

    const alreadyMember = await CommunityMembership.findOne({userId, communityId});
    
    if (alreadyMember) {
        if(alreadyMember.status === 'active') {
            throw new AppError('User is already a member of the community', 400);
        }

        alreadyMember.status = 'active';
        await alreadyMember.save();
        return alreadyMember;
    }

    const membership = await CommunityMembership.create({
        userId,
        communityId,
        role: 'member',
        status: 'active'
    })
    return membership;
}

 /**
  * Remove user from community
  * 
  * */

  async leaveCommunity(userId: string, communityId: any) {

    const membership = await CommunityMembership.findOne({
        userId, communityId
    });

    if(!membership) {
        throw new AppError('User is not a member of community', 404);
    }

    if(membership.status === 'banned') {
        throw new AppError('Banned users cannot leave the community', 400);
    }
    membership.status = 'inactive';
    await membership.save();
    return membership;
}


    /*
    * Get community members
    */
   async getCommunityMembers(communityId: any, page: number = 1, limit: number = 10) {
    
    const skip = (page - 1) * limit;

    const members = await CommunityMembership.find({ communityId, status: 'active' })
      .skip(skip)
      .limit(limit)
      .sort({ joinedAt: -1 })
      .populate('userId', 'fullName email'); // Populate user details

      if(!members) {
        throw new AppError('No members found for this community', 404);
      }

      const totalMembers = await CommunityMembership.countDocuments({ communityId, status: 'active' });
      
    return {
      members,
      totalMembers,
        currentPage: page,
        pages: Math.ceil(totalMembers / limit),
    };
    
  }

  /*
  * Get user communities
  */
 async getUserCommunities(userId: string) {

  const memberships = await CommunityMembership.find({ userId, status: 'active' }
  ).populate('communityId');

  if(!memberships) {
    throw new AppError('User is not a member of any communities', 404);
  }
  return memberships;

}

/*
* Get banned members of a community
*/ 
async getBannedMembers(communityId: any) {
  const bannedMembers = await CommunityMembership.find({ communityId, status: 'banned' })
    .populate('userId', 'fullName email');

  if(!bannedMembers) {
    throw new AppError('No banned members found for this community', 404);
  }
  return bannedMembers;
}

/*
* Check if user is member of community
*/
async isMember(userId: string, communityId: any) {
  const membership = await CommunityMembership.findOne({ userId, communityId, status: 'active' });
  return !!membership;
}



}