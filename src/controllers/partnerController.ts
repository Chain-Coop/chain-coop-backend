import { Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { BadRequestError, NotFoundError } from "../errors";
import * as partnerService from "../services/partnerService";

export const createPartner = async (req: Request, res: Response) => {
    const { firstName, lastName, email, phone, reason } = req.body;

    if (!firstName || !lastName || !email || !phone || !reason) {
        throw new BadRequestError("All fields requested")
    }

    const newPartner = await partnerService.createPartner({ firstName, lastName, email, phone, reason });

    res.status(StatusCodes.CREATED).json({
        msg: "Partner request submitted succesfully",
        partner: newPartner,
    });
};

export const getPartner = async (req: Request, res: Response) => {
    const { id } = req.params;
    const partner = partnerService.getPartnerById(id);

    if(!partner){
        throw new NotFoundError("Partner not found")
    };

    res.status(StatusCodes.OK).json({
        partner
    })
}

export const updatePartner = async (req: Request, res: Response) => {
    const { id } = req.params;
    const updateData = req.body;
    const partner = await partnerService.getPartnerById(id);

    if(!partner){
        throw new NotFoundError("Partner not found");
    }

    const updatePartner = await partnerService.updatePartner(id, updateData);
    res.status(StatusCodes.OK).json({
        updatePartner,
        msg: "Partner updated partner successfully!"
    });
};

export const deletePartner = async (req: Request, res: Response) => {
    const { id } = req.params;
    const partner = await partnerService.getPartnerById(id);

    if(!partner){
        throw new NotFoundError("Partner not found");
    };

    await partnerService.deletePartner(id);
    res.status(StatusCodes.OK).json({
        msg: "Partner deleted successfully"
    });
};

export const getAllPartners = async (req: Request, res: Response) => {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const partners = await partnerService.getAllPartners(page, limit);
  
    if (!partners.length) {
      return res.status(StatusCodes.OK).json({ msg: "No partners found", partners });
    }
  
    res.status(StatusCodes.OK).json({ count: partners.length, partners });
  };

