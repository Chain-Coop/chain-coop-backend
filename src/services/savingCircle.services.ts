import savingCircleModel, {
  SavingCircleDocument,
} from "../models/savingCircle.model";

export const createCircleService = async (circleData: SavingCircleDocument) => {
  try {
    const circle = new savingCircleModel(circleData);
    await circle.save();
    return circle;
  } catch (error) {
    throw error;
  }
};

export const getCircleService = async (circleId: string) => {
  try {
    const circle = await savingCircleModel.findById(circleId);
    return circle;
  } catch (error) {
    throw error;
  }
};

export const updateCircleService = async (
  circleId: string,
  circleData: Partial<SavingCircleDocument>
) => {
  try {
    const circle = await savingCircleModel.findByIdAndUpdate(
      circleId,
      circleData,
      { new: true }
    );
    return circle;
  } catch (error) {
    throw error;
  }
};

export const getCircleServiceByUserId = async (userId: string) => {
  try {
    const circle = await savingCircleModel.find({ "members.userId": userId });
    return circle;
  } catch (error) {
    throw error;
  }
};
