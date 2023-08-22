import {
  validateEmail,
  validateOrganizationId,
  validateOrganizationName,
} from "@/utils/organizations.validator";
import { validateUid, validateUserName } from "@/utils/user.validator";

export class OrganizationsEmailRequestBody {
  constructor(
    readonly userId: string,
    readonly userName: string,
    readonly email: string,
    readonly organizationId: string,
    readonly organizationName: string
  ) {
    this._validateUserId();
    this._validateUserName();
    this._validateEmail();
    this._validateOrganizationId();
    this._validateOrganizationName();
  }
  private _validateUserId = () => {
    validateUid(this.userId);
  };

  private _validateUserName = () => {
    validateUserName(this.userName);
  };
  private _validateEmail = () => {
    validateEmail(this.email);
  };
  private _validateOrganizationId = () => {
    validateOrganizationId(this.organizationId);
  };
  private _validateOrganizationName = () => {
    validateOrganizationName(this.organizationName);
  };
}
