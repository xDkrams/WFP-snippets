async function generateReport(id, params) {
  //validate user if exist
  const validateUserExist = await db.User.findOne({
    where: { empId: Number(id) },
  });

  if (validateUserExist) {
    //validate if admin
    const validateAdmin = await db.User.findOne({
      where: { empId: Number(id), admin: true },
    });
    
    if (!validateAdmin) {
      return {
        status: 400,
        message: "No administrative rights",
      };
    }
  } else {
    return {
      status: 404,
      message: "User not exist",
    };
  }

  // Convert params.date to a JavaScript Date object
  const targetDate = new Date(params.date);

  // Format targetDateFormatted to match the database date format
  const targetDateFormatted = targetDate
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
  const getDataByDate = await db.loanInfo_Trail.findAll({
    where: {
      [Op.and]: Sequelize.literal(
        `CAST("updatedAt" AS DATE) = '${targetDateFormatted}'`
      ),
      loanInfo_LoanTypeInfo: params.loanType.toLowerCase(),
    },
  });
  // Create an array to store user details
  const userDetailPromises = getDataByDate.map(async (item) => {
    // Find the user associated with this loan record
    const user = await db.User.findOne({
      where: { empId: item.empId },
    });

    return {
      transactionId: item.transactionId,
      loanApplicationNum: item.loanInfo_LoanApplicationNum,
      debit: item.debit,
      updatedBy: item.loanInfo_UpdatedBy,
      empId: item.empId,
      loanType: item.loanInfo_LoanTypeInfo,
      monthlyAmmortization: item.loanInfo_MoPayment,
      updatedAt: item.updatedAt,
      firstName: user ? user.firstName : null,
      lastName: user ? user.lastName : null,
    };
  });

  // Wait for all user detail queries to complete
  const userDataWithLoanDetails = await Promise.all(userDetailPromises);

  // Calculate the subtotal of debit amounts
  const subtotalDebitAmount = userDataWithLoanDetails.reduce(
    (total, item) => total + item.debit,
    0
  );

  // Prepare the response object
  const response = {
    subTotal: subtotalDebitAmount,
    shortedData: userDataWithLoanDetails,
  };

  return { status: 200, res: response };
}
