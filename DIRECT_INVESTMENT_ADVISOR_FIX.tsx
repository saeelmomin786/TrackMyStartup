// =====================================================
// DIRECT FIX FOR INVESTMENT ADVISOR VIEW
// =====================================================
// Replace the existing filtering logic in InvestmentAdvisorView.tsx

// REPLACE THIS SECTION (lines 113-180) with the corrected version:

// Get pending startup requests - CORRECTED VERSION
const pendingStartupRequests = useMemo(() => {
  if (!startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
    console.log('🔍 Pending Startup Requests: Missing data', { startups: !!startups, users: !!users });
    return [];
  }

  console.log('🔍 Pending Startup Requests Debug:', {
    totalStartups: startups.length,
    totalUsers: users.length,
    currentAdvisorCode: currentUser?.investment_advisor_code,
    currentUserId: currentUser?.id
  });

  // Find startups whose users have entered the investment advisor code but haven't been accepted
  const pendingStartups = startups.filter(startup => {
    // Find the user who owns this startup
    const startupUser = users.find(user => 
      user.role === 'Startup' && 
      user.id === startup.user_id
    );
    
    if (!startupUser) {
      console.log('🔍 No startup user found for startup:', startup.id, startup.name);
      return false;
    }

    // Check if this user has entered the investment advisor code
    const hasEnteredCode = (startupUser as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isNotAccepted = !(startupUser as any).advisor_accepted;

    console.log('🔍 Startup user check:', {
      startupId: startup.id,
      startupName: startup.name,
      userId: startupUser.id,
      userName: startupUser.name,
      userEmail: startupUser.email,
      enteredCode: (startupUser as any).investment_advisor_code_entered,
      currentAdvisorCode: currentUser?.investment_advisor_code,
      hasEnteredCode,
      advisorAccepted: (startupUser as any).advisor_accepted,
      isNotAccepted,
      shouldInclude: hasEnteredCode && isNotAccepted
    });

    return hasEnteredCode && isNotAccepted;
  });

  console.log('🔍 Pending Startup Requests Result:', {
    totalPending: pendingStartups.length,
    pendingStartups: pendingStartups.map(s => ({
      id: s.id,
      name: s.name,
      userId: s.user_id
    }))
  });

  return pendingStartups;
}, [startups, users, currentUser?.investment_advisor_code]);

// Get pending investor requests - CORRECTED VERSION
const pendingInvestorRequests = useMemo(() => {
  if (!users || !Array.isArray(users)) {
    console.log('🔍 Pending Investor Requests: Missing users data');
    return [];
  }

  console.log('🔍 Pending Investor Requests Debug:', {
    totalUsers: users.length,
    currentAdvisorCode: currentUser?.investment_advisor_code
  });

  // Find investors who have entered the investment advisor code but haven't been accepted
  const pendingInvestors = users.filter(user => {
    const hasEnteredCode = user.role === 'Investor' && 
      (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isNotAccepted = !(user as any).advisor_accepted;

    console.log('🔍 Investor check:', {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      userRole: user.role,
      enteredCode: (user as any).investment_advisor_code_entered,
      currentAdvisorCode: currentUser?.investment_advisor_code,
      hasEnteredCode,
      advisorAccepted: (user as any).advisor_accepted,
      isNotAccepted,
      shouldInclude: hasEnteredCode && isNotAccepted
    });

    return hasEnteredCode && isNotAccepted;
  });

  console.log('🔍 Pending Investor Requests Result:', {
    totalPending: pendingInvestors.length,
    pendingInvestors: pendingInvestors.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email
    }))
  });

  return pendingInvestors;
}, [users, currentUser?.investment_advisor_code]);

// Get accepted startups - CORRECTED VERSION
const myStartups = useMemo(() => {
  if (!startups || !Array.isArray(startups) || !users || !Array.isArray(users)) {
    console.log('🔍 My Startups: Missing data');
    return [];
  }

  console.log('🔍 My Startups Debug:', {
    totalStartups: startups.length,
    totalUsers: users.length,
    currentAdvisorCode: currentUser?.investment_advisor_code
  });

  // Find startups whose users have entered the investment advisor code and have been accepted
  const acceptedStartups = startups.filter(startup => {
    // Find the user who owns this startup
    const startupUser = users.find(user => 
      user.role === 'Startup' && 
      user.id === startup.user_id
    );
    
    if (!startupUser) {
      return false;
    }

    // Check if this user has entered the investment advisor code and has been accepted
    const hasEnteredCode = (startupUser as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isAccepted = (startupUser as any).advisor_accepted === true;

    console.log('🔍 Accepted startup check:', {
      startupId: startup.id,
      startupName: startup.name,
      userId: startupUser.id,
      userName: startupUser.name,
      hasEnteredCode,
      isAccepted,
      shouldInclude: hasEnteredCode && isAccepted
    });

    return hasEnteredCode && isAccepted;
  });

  console.log('🔍 My Startups Result:', {
    totalAccepted: acceptedStartups.length,
    acceptedStartups: acceptedStartups.map(s => ({
      id: s.id,
      name: s.name,
      userId: s.user_id
    }))
  });

  return acceptedStartups;
}, [startups, users, currentUser?.investment_advisor_code]);

// Get accepted investors - CORRECTED VERSION
const myInvestors = useMemo(() => {
  if (!users || !Array.isArray(users)) {
    console.log('🔍 My Investors: Missing users data');
    return [];
  }

  console.log('🔍 My Investors Debug:', {
    totalUsers: users.length,
    currentAdvisorCode: currentUser?.investment_advisor_code
  });

  // Find investors who have entered the investment advisor code and have been accepted
  const acceptedInvestors = users.filter(user => {
    const hasEnteredCode = user.role === 'Investor' && 
      (user as any).investment_advisor_code_entered === currentUser?.investment_advisor_code;
    const isAccepted = (user as any).advisor_accepted === true;

    console.log('🔍 Accepted investor check:', {
      userId: user.id,
      userName: user.name,
      userEmail: user.email,
      hasEnteredCode,
      isAccepted,
      shouldInclude: hasEnteredCode && isAccepted
    });

    return hasEnteredCode && isAccepted;
  });

  console.log('🔍 My Investors Result:', {
    totalAccepted: acceptedInvestors.length,
    acceptedInvestors: acceptedInvestors.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email
    }))
  });

  return acceptedInvestors;
}, [users, currentUser?.investment_advisor_code]);

// Create serviceRequests by combining pending startups and investors
const serviceRequests = useMemo(() => {
  const startupRequests = pendingStartupRequests.map(startup => {
    const startupUser = users.find(user => user.id === startup.user_id);
    return {
      id: startup.id,
      name: startup.name,
      email: startupUser?.email || '',
      type: 'startup',
      created_at: startup.created_at || new Date().toISOString()
    };
  });

  const investorRequests = pendingInvestorRequests.map(user => ({
    id: user.id,
    name: user.name,
    email: user.email,
    type: 'investor',
    created_at: user.created_at || new Date().toISOString()
  }));

  const allRequests = [...startupRequests, ...investorRequests];

  console.log('🔍 Service Requests Combined:', {
    totalRequests: allRequests.length,
    startupRequests: startupRequests.length,
    investorRequests: investorRequests.length,
    allRequests: allRequests.map(req => ({
      id: req.id,
      name: req.name,
      email: req.email,
      type: req.type
    }))
  });

  return allRequests;
}, [pendingStartupRequests, pendingInvestorRequests, users]);

// Debug logging for the complete state
console.log('🔍 Investment Advisor Complete Debug:', {
  currentUser: {
    id: currentUser?.id,
    name: currentUser?.name,
    email: currentUser?.email,
    role: currentUser?.role,
    investment_advisor_code: currentUser?.investment_advisor_code
  },
  dataCounts: {
    totalUsers: users?.length || 0,
    totalStartups: startups?.length || 0,
    pendingStartupRequests: pendingStartupRequests.length,
    pendingInvestorRequests: pendingInvestorRequests.length,
    myStartups: myStartups.length,
    myInvestors: myInvestors.length,
    serviceRequests: serviceRequests.length
  },
  pendingStartupDetails: pendingStartupRequests.map(s => ({
    id: s.id,
    name: s.name,
    userId: s.user_id
  })),
  pendingInvestorDetails: pendingInvestorRequests.map(u => ({
    id: u.id,
    name: u.name,
    email: u.email
  }))
});
